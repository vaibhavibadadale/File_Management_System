const Transfer = require("../models/Transfer");
const DeleteRequest = require("../models/DeleteRequest");
const User = require("../models/User");
const Department = require("../models/Department");
const File = require("../models/File");
const Trash = require("../models/Trash");

/**
 * HELPER: Moves files to the trash collection and removes them from the active File collection.
 */
// Updated Helper: Ensures full file data is fetched before moving to Trash
async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const file of files) {
        // Step 1: Ensure we have the full file object
        // If 'file' is just an ID string, we fetch it. If it's an object, we use it.
        let fileData = typeof file === 'string' ? await File.findById(file) : file;

        // Step 2: Safety check - if file is already deleted or not found, skip it
        if (!fileData || !fileData.originalName) {
            console.error(`File data missing for ID: ${file?._id || file}. Skipping trash move.`);
            continue;
        }

        // Step 3: Fetch Department Name for the Trash record
        const dept = await Department.findById(deptId);
        const deptName = dept?.departmentName || dept?.name || "N/A";

        // Step 4: Create Trash record with verified data
        await Trash.create({
            originalName: fileData.originalName, // This was the missing field causing the error
            path: fileData.path,
            size: fileData.size,
            mimetype: fileData.mimetype,
            originalFileId: fileData._id,
            deletedBy: sender,
            approvedBy: approver,
            departmentId: deptId,
            departmentName: deptName,
            deletedAt: new Date()
        });
        
        // Step 5: Remove from active files collection
        await File.findByIdAndDelete(fileData._id);
    }
}

// 1. CREATE REQUEST
exports.createRequest = async (req, res) => {
    try {
        const { senderUsername, senderRole, recipientId, fileIds, reason, requestType, departmentId } = req.body;
        
        if (!senderUsername || !senderRole || !departmentId) {
            return res.status(400).json({ error: "Missing required user information (Role/Dept/Username)" });
        }

        const isAutoApprove = senderRole?.toUpperCase() === "SUPERADMIN";

        // Fetch Sender Department Name
        const sUser = await User.findOne({ username: senderUsername });
        let sDeptName = "N/A";
        if (sUser) {
            const sd = await Department.findById(sUser.departmentId);
            sDeptName = sd?.departmentName || sd?.name || "N/A";
        }

        let rName = "N/A";
        let rDeptName = "N/A";
        let rRole = "USER";

        if (requestType === "delete") {
            rName = "SYSTEM";
            rDeptName = "TRASH";
        } else if (recipientId) {
            const rUser = await User.findById(recipientId);
            if (rUser) {
                rName = rUser.username;
                rRole = rUser.role;
                const rd = await Department.findById(rUser.departmentId);
                rDeptName = rd?.departmentName || rd?.name || "N/A";
            }
        }

        const commonData = {
            senderUsername,
            senderRole,
            fileIds,
            reason,
            requestType,
            departmentId,
            senderDeptName: sDeptName,
            receiverName: rName,
            receiverDeptName: rDeptName,
            receiverRole: rRole,
            status: isAutoApprove ? "completed" : "pending"
        };

        let newRequest;
        if (requestType === "delete") {
            newRequest = new DeleteRequest(commonData);
        } else {
            newRequest = new Transfer({ ...commonData, recipientId: recipientId || null });
        }

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUsername, "AUTO-SUPERADMIN", departmentId);
            } else if (recipientId) {
                await File.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
            }
        }

        await newRequest.save();
        res.status(201).json({ message: isAutoApprove ? "Action completed" : "Request sent for approval" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. GET DASHBOARD (HOD/Admin View)
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, pPage = 1, hPage = 1, limit = 5, search } = req.query;
        const roleUpper = role?.toUpperCase();

        let filter = {};

        if (roleUpper === "SUPERADMIN") {
            filter = { senderUsername: { $ne: username } };
        } 
        else if (roleUpper === "ADMIN") {
            filter = { 
                senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] },
                senderUsername: { $ne: username } 
            };
        } 
        else if (roleUpper === "HOD") {
            filter = { 
                $or: [
                    { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } }, 
                    { senderUsername: username }
                ] 
            };
        } 
        else {
            filter = { senderUsername: username };
        }

        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            filter.$and = [
                { ...filter },
                {
                    $or: [
                        { senderUsername: searchRegex },
                        { reason: searchRegex }
                    ]
                }
            ];
            if (filter.$or && roleUpper === "HOD") delete filter.$or;
        }

        const [transfers, deletes] = await Promise.all([
            Transfer.find(filter).populate("fileIds").populate("recipientId").lean(),
            DeleteRequest.find(filter).populate("fileIds").lean()
        ]);

        const combined = [...transfers, ...deletes];

        const processData = async (list) => {
            return Promise.all(list.map(async (item) => {
                let sDeptName = item.senderDeptName;
                if (!sDeptName || sDeptName === "N/A") {
                    const sUser = await User.findOne({ username: item.senderUsername });
                    if (sUser) {
                        const sd = await Department.findById(sUser.departmentId);
                        sDeptName = sd?.departmentName || sd?.name || "N/A";
                    }
                }
                return { 
                    ...item, 
                    senderDeptName: sDeptName || "N/A",
                    receiverName: item.receiverName || (item.requestType === "delete" ? "SYSTEM" : "N/A"),
                    receiverDeptName: item.receiverDeptName || (item.requestType === "delete" ? "TRASH" : "N/A")
                };
            }));
        };

        const processedAll = await processData(combined);
        const mainRequests = processedAll.filter(r => r.status === "pending").sort((a,b) => b.createdAt - a.createdAt);
        const logs = processedAll.filter(r => r.status !== "pending").sort((a,b) => b.updatedAt - a.updatedAt);

        const pLimit = parseInt(limit);
        const pStart = (parseInt(pPage) - 1) * pLimit;
        const hStart = (parseInt(hPage) - 1) * pLimit;

        res.json({
            mainRequests: mainRequests.slice(pStart, pStart + pLimit),
            logs: logs.slice(hStart, hStart + pLimit),
            totalPending: mainRequests.length,
            totalHistory: logs.length,
            pendingTotalPages: Math.ceil(mainRequests.length / pLimit),
            historyTotalPages: Math.ceil(logs.length / pLimit)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. GET MY REQUESTS (For the user who sent them)
exports.getMyRequests = async (req, res) => {
    try {
        const { username } = req.query;
        const [transfers, deletes] = await Promise.all([
            Transfer.find({ senderUsername: username }).populate("fileIds").lean(),
            DeleteRequest.find({ senderUsername: username }).populate("fileIds").lean()
        ]);
        res.json([...transfers, ...deletes].sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. APPROVE / DENY

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approverUsername } = req.body; 

        // POPULATE is the key here to fix the "originalName required" error
        let request = await Transfer.findById(id).populate("fileIds") || 
                      await DeleteRequest.findById(id).populate("fileIds");
        
        if (!request) return res.status(404).json({ message: "Request not found" });

        if (request.requestType === "delete") {
            // Passes the full file objects (containing originalName) to the helper
            await handleMoveToTrash(
                request.fileIds, 
                request.senderUsername, 
                approverUsername || "Authorized Admin", 
                request.departmentId
            );
        } else {
            const idsOnly = request.fileIds.map(f => f._id);
            await File.updateMany(
                { _id: { $in: idsOnly } }, 
                { $addToSet: { sharedWith: request.recipientId } }
            );
        }
        
        request.status = "completed";
        await request.save();
        res.json({ message: "Approved successfully" });

    } catch (err) { 
        console.error("Approval Error:", err);
        res.status(500).json({ error: "Server Error: " + err.message }); 
    }
};
exports.denyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        let request = await Transfer.findById(id) || await DeleteRequest.findById(id);
        
        if (!request) return res.status(404).json({ message: "Request not found" });

        request.status = "denied";
        request.denialComment = req.body.denialComment || "Rejected";
        
        await request.save();
        res.json({ message: "Denied" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. TRASH HANDLERS
exports.getTrashItems = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let query = {};
        
        if (role?.toUpperCase() === "HOD") {
            query = { departmentId: departmentId };
        }

        const items = await Trash.find(query).sort({ deletedAt: -1 });
        res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.restoreFromTrash = async (req, res) => {
    try {
        const item = await Trash.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Trash item not found" });
        
        const data = item.toObject();
        const originalId = data.originalFileId;
        
        delete data._id; 
        delete data.deletedAt; 
        delete data.originalFileId;
        delete data.departmentName;
        delete data.approvedBy;
        delete data.deletedBy;

        await File.create({ ...data, _id: originalId });
        await Trash.findByIdAndDelete(req.params.id);
        
        res.json({ message: "Restored" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.permanentDelete = async (req, res) => {
    try {
        await Trash.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted Permanently" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};