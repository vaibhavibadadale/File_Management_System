const Transfer = require("../models/Transfer");
const User = require("../models/User");
const Department = require("../models/Department");
const File = require("../models/File");
const Trash = require("../models/Trash");

// Helper to move files to the trash collection
async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const file of files) {
        const fileData = typeof file === 'string' ? await File.findById(file) : file;
        if (!fileData) continue;

        await Trash.create({
            originalName: fileData.originalName,
            path: fileData.path,
            size: fileData.size,
            mimetype: fileData.mimetype,
            originalFileId: fileData._id,
            deletedBy: sender,
            approvedBy: approver,
            departmentId: deptId,
            deletedAt: new Date()
        });
        await File.findByIdAndDelete(fileData._id);
    }
}

// 1. CREATE REQUEST (Updated to save Department Names in DB)
exports.createRequest = async (req, res) => {
    try {
        const { senderUsername, senderRole, recipientId, fileIds, reason, requestType, departmentId } = req.body;
        const isAutoApprove = ["ADMIN", "SUPERADMIN"].includes(senderRole?.toUpperCase());

        // Fetch Sender Department Name for storage
        const sUser = await User.findOne({ username: senderUsername });
        let sDeptName = "N/A";
        if (sUser) {
            const sd = await Department.findById(sUser.departmentId);
            sDeptName = sd?.departmentName || sd?.name || "N/A";
        }

        // Fetch Receiver Details for storage
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

        const newRequest = new Transfer({
            senderUsername,
            senderRole,
            recipientId: recipientId || null,
            fileIds,
            reason,
            requestType,
            departmentId,
            senderDeptName: sDeptName,     // Saved to DB
            receiverName: rName,           // Saved to DB
            receiverDeptName: rDeptName,   // Saved to DB
            receiverRole: rRole,           // Saved to DB
            status: isAutoApprove ? "completed" : "pending"
        });

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUsername, "AUTO-ADMIN", departmentId);
            } else if (recipientId) {
                await File.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
            }
        }
        await newRequest.save();
        res.status(201).json({ message: "Request processed" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. GET DASHBOARD (Robust lookup for existing and new records)
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, pPage = 1, hPage = 1, limit = 5, search } = req.query;
        const roleUpper = role?.toUpperCase();

        let filter = {};
        if (roleUpper === "HOD") {
            filter = { $or: [{ departmentId: departmentId, senderRole: "EMPLOYEE" }, { senderUsername: username }] };
        } else if (!["ADMIN", "SUPERADMIN"].includes(roleUpper)) {
            filter = { senderUsername: username };
        }

        // Add search functionality if search term exists
        if (search) {
            filter.$or = [
                ...(filter.$or || []),
                { senderUsername: { $regex: search, $options: "i" } },
                { reason: { $regex: search, $options: "i" } }
            ];
        }

        const pSkip = (parseInt(pPage) - 1) * parseInt(limit);
        const hSkip = (parseInt(hPage) - 1) * parseInt(limit);

        const [pReqs, hReqs, totalP, totalH] = await Promise.all([
            Transfer.find({ ...filter, status: "pending" }).sort({ createdAt: -1 }).skip(pSkip).limit(parseInt(limit)).populate("fileIds").populate("recipientId").lean(),
            Transfer.find({ ...filter, status: { $ne: "pending" } }).sort({ updatedAt: -1 }).skip(hSkip).limit(parseInt(limit)).populate("fileIds").populate("recipientId").lean(),
            Transfer.countDocuments({ ...filter, status: "pending" }),
            Transfer.countDocuments({ ...filter, status: { $ne: "pending" } })
        ]);

        const processData = async (list) => {
            return Promise.all(list.map(async (item) => {
                // If data is already stored in the document, use it. Otherwise, fetch it (for old records).
                let sDeptName = item.senderDeptName;
                let rDeptName = item.receiverDeptName;
                let rUsername = item.receiverName;
                let rRole = item.receiverRole;

                // Fallback for older records that don't have the names saved yet
                if (!sDeptName || sDeptName === "N/A") {
                    const sUser = await User.findOne({ username: item.senderUsername });
                    if (sUser) {
                        const sd = await Department.findById(sUser.departmentId);
                        sDeptName = sd?.departmentName || sd?.name || "N/A";
                    }
                }

                if (!rDeptName || rDeptName === "N/A") {
                    if (item.recipientId) {
                        rUsername = item.recipientId.username;
                        rRole = item.recipientId.role;
                        const rd = await Department.findById(item.recipientId.departmentId);
                        rDeptName = rd?.departmentName || rd?.name || "N/A";
                    } else if (item.requestType === "delete") {
                        rUsername = "SYSTEM";
                        rDeptName = "TRASH";
                    }
                }

                return { 
                    ...item, 
                    senderDeptName: sDeptName || "N/A", 
                    receiverName: rUsername || "N/A", 
                    receiverDeptName: rDeptName || "N/A",
                    receiverRole: rRole || "USER" 
                };
            }));
        };

        res.json({
            mainRequests: await processData(pReqs),
            logs: await processData(hReqs),
            totalPending: totalP,
            totalHistory: totalH,
            pendingTotalPages: Math.ceil(totalP / limit),
            historyTotalPages: Math.ceil(totalH / limit)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. APPROVE / DENY
exports.approveRequest = async (req, res) => {
    try {
        const request = await Transfer.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Not found" });

        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, "Authorized", request.departmentId);
        } else {
            await File.updateMany({ _id: { $in: request.fileIds } }, { $addToSet: { sharedWith: request.recipientId } });
        }
        request.status = "completed";
        await request.save();
        res.json({ message: "Approved" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.denyRequest = async (req, res) => {
    try {
        await Transfer.findByIdAndUpdate(req.params.id, { 
            status: "denied", 
            denialComment: req.body.denialComment || "Rejected" 
        });
        res.json({ message: "Denied" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. TRASH HANDLERS
exports.getTrashItems = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let query = (role?.toUpperCase() === "HOD") ? { departmentId } : {};
        const items = await Trash.find(query).sort({ deletedAt: -1 });
        res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.restoreFromTrash = async (req, res) => {
    try {
        const item = await Trash.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Not found" });
        const data = item.toObject();
        const originalId = data.originalFileId;
        delete data._id; delete data.deletedAt; delete data.originalFileId;
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