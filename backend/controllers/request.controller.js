const Request = require("../models/Request");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const Trash = require("../models/Trash");
const DeleteRequest = require("../models/DeleteRequest");
const Transfer = require("../models/Transfer");
const mongoose = require("mongoose");

// --- HELPERS ---

async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const fileId of files) {
        const actualId = fileId._id || fileId;
        if (!mongoose.Types.ObjectId.isValid(actualId)) continue;

        let fileData = await File.findById(actualId);
        if (!fileData) continue;

        const dept = await Department.findById(deptId);
        const senderUser = await User.findOne({ username: sender.toLowerCase() });

        await Trash.create({
            originalName: fileData.originalName || fileData.name || "Unnamed File",
            filename: fileData.filename,
            path: fileData.path,
            size: fileData.size,
            mimeType: fileData.mimeType || fileData.mimetype,
            originalFileId: fileData._id,
            uploadedBy: fileData.uploadedBy,
            sharedWith: fileData.sharedWith,
            folder: fileData.folder, // Keep track of folder location
            username: fileData.username, // Keep track of original owner string
            deletedBy: sender,
            senderRole: senderUser?.role?.toUpperCase() || "EMPLOYEE", 
            approvedBy: approver,
            departmentId: deptId,
            departmentName: dept?.departmentName || dept?.name || "General",
            deletedAt: new Date(),
            reason: "Approved Request"
        });

        await File.findByIdAndDelete(fileData._id);
    }
}

async function handleOwnershipTransfer(fileIds, recipientId, senderUsername) {
    if (!recipientId || !fileIds.length) return;

    const idsOnly = fileIds.map(f => (f._id ? f._id : f));
    const senderUser = await User.findOne({ username: senderUsername });
    const senderId = senderUser ? senderUser._id : null;

    const updateOps = {
        $set: { uploadedBy: recipientId },
        $addToSet: { sharedWith: recipientId }
    };

    if (senderId) {
        updateOps.$addToSet.sharedWith = { $each: [recipientId, senderId] };
    }

    await Promise.all([
        File.updateMany({ _id: { $in: idsOnly } }, updateOps),
        Folder.updateMany({ _id: { $in: idsOnly } }, updateOps)
    ]);
}

// --- CONTROLLERS ---

exports.createRequest = async (req, res) => {
    try {
        const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;

        const senderUser = await User.findOne({ username: senderUsername.toLowerCase() }).populate('departmentId');
        if (!senderUser) return res.status(404).json({ message: "User not found" });

        const sRole = (senderUser.role || "USER").toUpperCase();
        const finalDeptId = senderUser.departmentId?._id || senderUser.departmentId;
        const sDeptName = senderUser.departmentId?.departmentName || "General";

        const isAutoApprove = (sRole === "SUPERADMIN");

        const commonData = {
            requestType: requestType || "transfer",
            fileIds,
            senderUsername: senderUser.username,
            senderRole: sRole,
            senderDeptName: sDeptName,
            departmentId: finalDeptId,
            reason: reason || "No reason provided",
            status: isAutoApprove ? "completed" : "pending"
        };

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUsername, `AUTO-${sRole}`, finalDeptId);
            } else if (recipientId) {
                await handleOwnershipTransfer(fileIds, recipientId, senderUsername);
            }
        } else {
            let query = [];
            if (["USER", "EMPLOYEE"].includes(sRole)) {
                query = [
                    { role: { $in: ['ADMIN', 'SUPERADMIN'] } },
                    { role: 'HOD', departmentId: finalDeptId }
                ];
            } else if (sRole === "HOD") {
                query = [{ role: { $in: ['ADMIN', 'SUPERADMIN'] } }];
            } else if (sRole === "ADMIN") {
                query = [{ role: 'SUPERADMIN' }];
            }

            const staffToNotify = await User.find({ $or: query, deletedAt: null });
            const notifications = staffToNotify
                .filter(u => u.username !== senderUsername)
                .map(u => ({
                    recipientId: u._id,
                    title: `New ${requestType.toUpperCase()} Request`,
                    message: `${senderUsername} (${sDeptName}) requested a ${requestType}.`,
                    type: requestType === 'delete' ? 'DELETE_REQUEST' : 'TRANSFER_REQUEST'
                }));

            if (notifications.length > 0) await Notification.insertMany(notifications);
        }

        if (requestType === "delete") {
            await new DeleteRequest(commonData).save();
        } else {
            await new Transfer({ ...commonData, recipientId }).save();
        }

        const mainReq = new Request({ ...commonData, recipientId });
        await mainReq.save();

        res.status(201).json({
            message: isAutoApprove ? "Action completed instantly" : "Request sent for approval",
            data: mainReq
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, search = "", pPage = 1, hPage = 1, limit = 5 } = req.query;
        const roleUpper = role?.toUpperCase();
        let filter = {};

        if (roleUpper === "SUPERADMIN") {
            filter = {};
        } else if (roleUpper === "ADMIN") {
            filter = { 
                $or: [
                    { senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } }, 
                    { senderUsername: username }
                ] 
            };
        } else if (roleUpper === "HOD") {
            const deptSearch = mongoose.Types.ObjectId.isValid(departmentId) 
                ? new mongoose.Types.ObjectId(departmentId) 
                : departmentId;

            filter = {
                $or: [
                    { departmentId: deptSearch, senderRole: { $in: ["EMPLOYEE", "USER"] } },
                    { senderUsername: username }
                ]
            };
        } else {
            filter = { senderUsername: username };
        }

        if (search) filter.reason = new RegExp(search, "i");

        const allRequests = await Request.find(filter)
            .populate("fileIds")
            .populate("recipientId", "username")
            .sort({ createdAt: -1 })
            .lean();

        const mainRequests = allRequests.filter(r => r.status?.toLowerCase() === "pending");
        const logs = allRequests.filter(r => r.status?.toLowerCase() !== "pending");

        const pLimit = parseInt(limit);

        res.json({
            mainRequests: mainRequests.slice((pPage - 1) * pLimit, pPage * pLimit),
            logs: logs.slice((hPage - 1) * pLimit, hPage * pLimit),
            totalPending: mainRequests.length,
            totalHistory: logs.length,
            pendingTotalPages: Math.ceil(mainRequests.length / pLimit) || 1,
            historyTotalPages: Math.ceil(logs.length / pLimit) || 1
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approverUsername } = req.body;

        const request = await Request.findById(id).populate('fileIds');
        if (!request || request.status?.toLowerCase() !== "pending") {
            return res.status(404).json({ message: "Request not found or already processed" });
        }

        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, approverUsername, request.departmentId);
            await DeleteRequest.findOneAndUpdate(
                { senderUsername: request.senderUsername, createdAt: request.createdAt },
                { status: "completed", updatedAt: new Date() }
            );
        } else {
            await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername);
            await Transfer.findOneAndUpdate(
                { senderUsername: request.senderUsername, createdAt: request.createdAt },
                { status: "completed", updatedAt: new Date() }
            );
        }

        request.status = "completed";
        request.updatedAt = new Date();
        await request.save();

        const sender = await User.findOne({ username: request.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Approved',
                message: `Your ${request.requestType} request was approved by ${approverUsername}.`,
                type: 'REQUEST_APPROVED'
            });
        }
        res.json({ message: "Approved successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.denyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { denialComment, approverUsername } = req.body;

        const request = await Request.findByIdAndUpdate(id, {
            status: "denied",
            denialComment,
            updatedAt: new Date()
        }, { new: true });

        if (request.requestType === "delete") {
            await DeleteRequest.findOneAndUpdate(
                { senderUsername: request.senderUsername, createdAt: request.createdAt },
                { status: "denied", denialComment, updatedAt: new Date() }
            );
        } else {
            await Transfer.findOneAndUpdate(
                { senderUsername: request.senderUsername, createdAt: request.createdAt },
                { status: "denied", denialComment, updatedAt: new Date() }
            );
        }

        const sender = await User.findOne({ username: request.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Denied',
                message: `Your request was denied by ${approverUsername}. Reason: ${denialComment}`,
                type: 'REQUEST_DENIED'
            });
        }
        res.json({ message: "Denied successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTrashItems = async (req, res) => {
    try {
        const { role, departmentId, username } = req.query;
        const roleUpper = role?.toUpperCase();
        let query = {};

        if (roleUpper === "SUPERADMIN") {
            query = {}; 
        } else if (roleUpper === "ADMIN") {
            query = { 
                $or: [
                    { senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } },
                    { deletedBy: username }
                ] 
            };
        } else if (roleUpper === "HOD") {
            query = { 
                departmentId: departmentId, 
                senderRole: { $in: ["EMPLOYEE", "USER"] } 
            };
        } else {
            query = { deletedBy: username };
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

        // Clean up metadata that shouldn't go back into the File collection
        const trashMetadata = [
            '_id', 'deletedAt', 'originalFileId', 'departmentName', 
            'approvedBy', 'deletedBy', 'reason', 'senderRole', 
            '__v', 'createdAt', 'updatedAt'
        ];
        
        trashMetadata.forEach(key => delete data[key]);

        // RE-CREATION STEP:
        // By including 'folder' and 'username' in 'data', File.create puts them back
        await File.create({ 
            ...data, 
            _id: originalId,
            deletedAt: null 
        });

        await Trash.findByIdAndDelete(req.params.id);

        res.json({ message: "File restored successfully to original location" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.permanentDelete = async (req, res) => {
    try {
        const deletedItem = await Trash.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ message: "Item not found" });
        res.json({ message: "File permanently deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getReceivedFiles = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Valid User ID is required" });
        const filter = { $or: [{ userId: userId }, { uploadedBy: userId }, { sharedWith: userId }] };
        const [files, folders] = await Promise.all([File.find(filter).lean(), Folder.find(filter).lean()]);
        res.json({ files, folders });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let query = {};
        if (role?.toUpperCase() === "HOD" && departmentId) {
            const deptSearch = mongoose.Types.ObjectId.isValid(departmentId) ? new mongoose.Types.ObjectId(departmentId) : departmentId;
            query = { departmentId: deptSearch };
        }
        const stats = await Request.aggregate([
            { $match: query },
            { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } }
        ]);
        const formatted = { pending: 0, completed: 0, denied: 0 };
        stats.forEach(s => { if (s._id && formatted.hasOwnProperty(s._id)) formatted[s._id] = s.count; });
        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.restoreAllTrash = async (req, res) => {
    try {
        const { role, departmentId, username } = req.query;
        const roleUpper = role?.toUpperCase();
        let query = {};

        if (roleUpper === "SUPERADMIN") query = {};
        else if (roleUpper === "ADMIN") query = { $or: [{ senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } }, { deletedBy: username }] };
        else if (roleUpper === "HOD") query = { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } };
        else query = { deletedBy: username };

        const items = await Trash.find(query);
        if (items.length === 0) return res.status(404).json({ message: "No items to restore" });

        for (const item of items) {
            const data = item.toObject();
            const originalId = data.originalFileId;
            const trashMetadata = ['_id', 'deletedAt', 'originalFileId', 'departmentName', 'approvedBy', 'deletedBy', 'reason', 'senderRole', '__v', 'createdAt', 'updatedAt'];
            trashMetadata.forEach(key => delete data[key]);

            await File.create({ ...data, _id: originalId, deletedAt: null });
            await Trash.findByIdAndDelete(item._id);
        }

        res.json({ message: `Successfully restored ${items.length} files.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.emptyTrash = async (req, res) => {
    try {
        const { role, departmentId, username } = req.query;
        const roleUpper = role?.toUpperCase();
        let query = {};

        if (roleUpper === "SUPERADMIN") query = {};
        else if (roleUpper === "ADMIN") query = { $or: [{ senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } }, { deletedBy: username }] };
        else if (roleUpper === "HOD") query = { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } };
        else query = { deletedBy: username };

        const result = await Trash.deleteMany(query);
        res.json({ message: `Permanently deleted ${result.deletedCount} items.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
};