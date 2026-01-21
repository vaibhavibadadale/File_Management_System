const Transfer = require("../models/Transfer");
const DeleteRequest = require("../models/DeleteRequest");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const Trash = require("../models/Trash");
const mongoose = require("mongoose");

// --- HELPERS ---

/**
 * Moves files to Trash collection and removes from File collection
 */
async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const fileId of files) {
        let fileData = await File.findById(fileId);
        if (!fileData) continue;

        const dept = await Department.findById(deptId);
        
        await Trash.create({
            originalName: fileData.originalName || fileData.name || "Unnamed File",
            path: fileData.path,
            size: fileData.size,
            mimetype: fileData.mimetype || fileData.mimeType,
            originalFileId: fileData._id,
            deletedBy: sender,
            approvedBy: approver,
            departmentId: deptId,
            departmentName: dept?.departmentName || dept?.name || "General",
            deletedAt: new Date(),
            reason: "Approved Request"
        });
        
        await File.findByIdAndDelete(fileData._id);
    }
}

/**
 * UPDATED: Changes owner to recipient but keeps sender in shared list
 * This ensures BOTH can see the file.
 */
async function handleOwnershipTransfer(fileIds, recipientId, senderUsername) {
    if (!recipientId) return;
    const idsOnly = fileIds.map(f => (f._id ? f._id : f));
    
    // Find the sender user object to get their ID
    const senderUser = await User.findOne({ username: senderUsername });
    const senderId = senderUser ? senderUser._id : null;

    // Update Files: 
    // 1. Set Recipient as the main owner (uploadedBy/userId)
    // 2. Add BOTH recipient and sender to sharedWith array to ensure mutual visibility
    const updateOps = {
        $set: { userId: recipientId, uploadedBy: recipientId },
        $addToSet: { sharedWith: recipientId }
    };

    if (senderId) {
        updateOps.$addToSet.sharedWith = { $each: [recipientId, senderId] };
    }

    await File.updateMany({ _id: { $in: idsOnly } }, updateOps);

    // Update Folders similarly
    await Folder.updateMany(
        { _id: { $in: idsOnly } },
        updateOps
    );
}

// --- CONTROLLERS ---

exports.createRequest = async (req, res) => {
    try {
        const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;

        if (!senderUsername || !fileIds || fileIds.length === 0) {
            return res.status(400).json({ error: "Sender and files are required." });
        }

        const sUser = await User.findOne({ username: senderUsername }).populate('departmentId');
        if (!sUser) return res.status(404).json({ error: "Sender user not found." });

        const finalDeptId = sUser.departmentId?._id || sUser.departmentId;
        const sDeptName = sUser.departmentId?.departmentName || sUser.departmentId?.name || "General";
        const sRole = sUser.role?.toUpperCase() || "USER";

        const isAutoApprove = (sRole === "SUPERADMIN" || sRole === "ADMIN");

        let rName = "SYSTEM", rDeptName = "TRASH", rRole = "SYSTEM";
        if (requestType !== "delete" && recipientId && recipientId !== "null") {
            const rUser = await User.findById(recipientId).populate('departmentId');
            if (rUser) {
                rName = rUser.username;
                rRole = rUser.role || "USER";
                rDeptName = rUser.departmentId?.departmentName || rUser.departmentId?.name || "General";
            }
        }

        const commonData = {
            senderUsername,
            senderRole: sRole,
            fileIds,
            reason: reason || "No reason provided",
            requestType: requestType || "transfer",
            departmentId: finalDeptId,
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
            newRequest = new Transfer({ 
                ...commonData, 
                recipientId: mongoose.Types.ObjectId.isValid(recipientId) ? recipientId : null 
            });
        }

        await newRequest.save();

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUsername, `AUTO-${sRole}`, finalDeptId);
            } else if (newRequest.recipientId) {
                // Pass senderUsername to helper to maintain visibility
                await handleOwnershipTransfer(fileIds, newRequest.recipientId, senderUsername);
            }
        } else {
            try {
                const staffToNotify = await User.find({
                    $or: [
                        { role: { $in: ['ADMIN', 'SUPERADMIN', 'Admin', 'SuperAdmin'] } },
                        { role: 'HOD', departmentId: finalDeptId }
                    ],
                    deletedAt: null
                });

                const notificationEntries = staffToNotify
                    .filter(u => u.username !== senderUsername)
                    .map(u => ({
                        recipientId: u._id,
                        title: `New ${requestType.toUpperCase()} Request`,
                        message: `${senderUsername} (${sDeptName}) requested a ${requestType}.`,
                        type: requestType === 'delete' ? 'DELETE_REQUEST' : 'TRANSFER_REQUEST',
                        isRead: false
                    }));

                if (notificationEntries.length > 0) await Notification.insertMany(notificationEntries);
            } catch (nErr) { console.error("Notification Error:", nErr); }
        }
        res.status(201).json({ message: "Success", data: newRequest });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, search = "", pPage = 1, hPage = 1, limit = 10 } = req.query;
        const roleUpper = role?.toUpperCase();
        const searchRegex = new RegExp(search, "i");
        
        let filter = {};
        if (roleUpper === "HOD" && departmentId) {
            filter = { 
                $or: [
                    { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } }, 
                    { senderUsername: username }
                ] 
            };
        } else if (roleUpper !== "SUPERADMIN" && roleUpper !== "ADMIN") {
            filter = { senderUsername: username };
        }

        if (search) {
            filter.reason = searchRegex;
        }

        const [transfers, deletes] = await Promise.all([
            Transfer.find(filter).populate("fileIds").populate("recipientId", "username").lean(),
            DeleteRequest.find(filter).populate("fileIds").lean()
        ]);

        const combined = [...transfers, ...deletes];
        const mainRequests = combined.filter(r => r.status === "pending").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const logs = combined.filter(r => r.status !== "pending").sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        const pLimit = parseInt(limit);
        const pStart = (parseInt(pPage) - 1) * pLimit;
        const hStart = (parseInt(hPage) - 1) * pLimit;

        res.json({
            mainRequests: mainRequests.slice(pStart, pStart + pLimit).map(r => ({ ...r, isActionable: r.senderUsername !== username })),
            logs: logs.slice(hStart, hStart + pLimit),
            totalPending: mainRequests.length,
            totalHistory: logs.length,
            pendingTotalPages: Math.ceil(mainRequests.length / pLimit) || 1,
            historyTotalPages: Math.ceil(logs.length / pLimit) || 1
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approverUsername } = req.body;

        const request = await Transfer.findById(id) || await DeleteRequest.findById(id);
        if (!request) return res.status(404).json({ message: "Request not found" });

        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, approverUsername, request.departmentId);
        } else {
            // Update: Ensuring both sender and receiver have access
            await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername);
        }

        request.status = "completed";
        await request.save();

        const sender = await User.findOne({ username: request.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Approved',
                message: `Your ${request.requestType} request was approved by ${approverUsername}.`,
                type: 'REQUEST_APPROVED',
                isRead: false
            });
        }

        if (request.recipientId) {
            await Notification.create({
                recipientId: request.recipientId,
                title: 'Files Received',
                message: `You have received new files from ${request.senderUsername}.`,
                type: 'FILES_RECEIVED',
                isRead: false
            });
        }

        res.json({ message: "Approved successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.denyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { denialComment, approverUsername } = req.body;

        const request = await Transfer.findByIdAndUpdate(id, { status: "denied", denialComment }, { new: true }) || 
                        await DeleteRequest.findByIdAndUpdate(id, { status: "denied", denialComment }, { new: true });

        if (!request) return res.status(404).json({ message: "Request not found" });

        const sender = await User.findOne({ username: request.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Denied',
                message: `Your request was denied. Reason: ${denialComment}`,
                type: 'REQUEST_DENIED',
                isRead: false
            });
        }
        res.json({ message: "Denied successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * UPDATED: Fetches files where user is either the owner OR in the shared list.
 * This makes transferred files stay visible for the sender.
 */
exports.getReceivedFiles = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const filter = {
            $or: [
                { userId: userId },
                { uploadedBy: userId },
                { sharedWith: userId } // Visibility for both sender/receiver
            ]
        };

        const [files, folders] = await Promise.all([
            File.find(filter).lean(),
            Folder.find(filter).lean()
        ]);

        res.json({ files, folders });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTrashItems = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let query = {};
        if (role?.toUpperCase() === "HOD" || role?.toUpperCase() === "EMPLOYEE") {
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
        
        delete data._id; delete data.deletedAt; delete data.originalFileId; 
        delete data.departmentName; delete data.approvedBy; delete data.deletedBy;
        
        await File.create({ ...data, _id: originalId });
        await Trash.findByIdAndDelete(req.params.id);
        res.json({ message: "File restored successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.permanentDelete = async (req, res) => {
    try {
        await Trash.findByIdAndDelete(req.params.id);
        res.json({ message: "File permanently deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let query = {};
        if (role?.toUpperCase() === "HOD" && departmentId) {
            query = { departmentId: departmentId };
        }
        const [pending, completed, denied] = await Promise.all([
            Transfer.countDocuments({ ...query, status: "pending" }),
            Transfer.countDocuments({ ...query, status: "completed" }),
            Transfer.countDocuments({ ...query, status: "denied" })
        ]);
        res.json({ pending, completed, denied });
    } catch (err) { res.status(500).json({ error: err.message }); }
};