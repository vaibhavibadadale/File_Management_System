const Transfer = require("../models/Transfer");
const DeleteRequest = require("../models/DeleteRequest");
const File = require("../models/File");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const Trash = require("../models/Trash");
const mongoose = require("mongoose");

// --- HELPERS ---
async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const file of files) {
        let fileData = typeof file === 'string' ? await File.findById(file) : file;
        if (!fileData) continue;
        const dept = await Department.findById(deptId);
        await Trash.create({
            originalName: fileData.originalName || "Unnamed File",
            path: fileData.path,
            size: fileData.size,
            mimetype: fileData.mimetype,
            originalFileId: fileData._id,
            deletedBy: sender,
            approvedBy: approver,
            departmentId: deptId,
            departmentName: dept?.departmentName || "General",
            deletedAt: new Date()
        });
        await File.findByIdAndDelete(fileData._id);
    }
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

        const finalDeptId = sUser.departmentId?._id || null;
        const sDeptName = sUser.departmentId?.departmentName || "General";
        const sRole = sUser.role?.toUpperCase() || "USER";

        const isAutoApprove = (sRole === "SUPERADMIN" || sRole === "ADMIN");

        let rName = "SYSTEM", rDeptName = "TRASH", rRole = "SYSTEM";
        if (requestType !== "delete" && recipientId && recipientId !== "null") {
            const rUser = await User.findById(recipientId).populate('departmentId');
            if (rUser) {
                rName = rUser.username;
                rRole = rUser.role || "USER";
                rDeptName = rUser.departmentId?.departmentName || "General";
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

        let newRequest = (requestType === "delete") 
            ? new DeleteRequest(commonData) 
            : new Transfer({ ...commonData, recipientId: mongoose.Types.ObjectId.isValid(recipientId) ? recipientId : null });

        await newRequest.save();

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUsername, `AUTO-${sRole}`, finalDeptId);
            } else if (newRequest.recipientId) {
                await File.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: newRequest.recipientId } });
            }
        } else {
            try {
                const hodeDeptId = finalDeptId ? new mongoose.Types.ObjectId(finalDeptId) : null;
                const staffToNotify = await User.find({
                    $or: [
                        { role: { $in: ['ADMIN', 'SUPERADMIN', 'Admin', 'SuperAdmin'] } },
                        { role: 'HOD', departmentId: hodeDeptId }
                    ],
                    deletedAt: null
                });

                // FIX: Unique Staff AND STRICTLY FILTER OUT the sender (Stops HOD getting own request)
                const uniqueStaff = Array.from(
                    new Map(staffToNotify.map(user => [user._id.toString(), user])).values()
                ).filter(u => u.username !== senderUsername); // Stops self-notification

                const notificationEntries = uniqueStaff.map(u => ({
                    recipientId: u._id,
                    targetRoles: ['ADMIN', 'SUPERADMIN', 'HOD'],
                    department: sDeptName,
                    departmentId: finalDeptId, 
                    title: `New ${requestType.toUpperCase()} Request`,
                    message: `${senderUsername} (${sDeptName}) requested a ${requestType}.`,
                    type: requestType === 'delete' ? 'DELETE_REQUEST' : 'TRANSFER_REQUEST',
                    isRead: false
                }));

                if (notificationEntries.length > 0) {
                    await Notification.insertMany(notificationEntries);
                }
            } catch (nErr) { console.error("❌ Notification Engine Error:", nErr); }
        }
        res.status(201).json({ message: "Success", data: newRequest });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, search = "", pPage = 1, hPage = 1, limit = 5 } = req.query;
        const roleUpper = role?.toUpperCase();
        const searchRegex = new RegExp(search, "i");
        let filter = {};

        if (roleUpper === "SUPERADMIN" || roleUpper === "ADMIN") {
            filter = {}; 
        } else if (roleUpper === "HOD" && departmentId) {
            const deptObjectId = new mongoose.Types.ObjectId(departmentId);
            filter = { 
                $or: [
                    { departmentId: deptObjectId, senderRole: { $in: ["EMPLOYEE", "USER"] } }, 
                    { senderUsername: username }
                ] 
            };
        } else {
            filter = { senderUsername: username };
        }

        if (search) {
            filter = { 
                ...filter, 
                $or: [
                    { senderUsername: searchRegex }, 
                    { reason: searchRegex }, 
                    { receiverName: searchRegex }
                ] 
            };
        }

        const [transfers, deletes] = await Promise.all([
            Transfer.find(filter).populate("fileIds").lean(),
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

        const request = await Transfer.findById(id).populate("fileIds") || 
                        await DeleteRequest.findById(id).populate("fileIds");
        
        if (!request) return res.status(404).json({ message: "Request not found" });

        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, approverUsername, request.departmentId);
        } else {
            const idsOnly = request.fileIds.map(f => f._id);
            await File.updateMany({ _id: { $in: idsOnly } }, { $addToSet: { sharedWith: request.recipientId } });
        }

        request.status = "completed";
        await request.save();

        // 1. Notify Sender
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

        // 2. Notify Admins
        const admins = await User.find({ role: { $in: ['ADMIN', 'SUPERADMIN'] }, deletedAt: null });
        const adminNotifications = admins
            .filter(admin => admin.username !== approverUsername)
            .map(admin => ({
                recipientId: admin._id,
                targetRoles: ['ADMIN', 'SUPERADMIN'],
                title: 'Request Approved',
                message: `${approverUsername} approved a ${request.requestType} request from ${request.senderUsername}.`,
                type: 'ADMIN_ACTION_ALERT',
                isRead: false
            }));
        if (adminNotifications.length > 0) await Notification.insertMany(adminNotifications);

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

        // 1. Notify Sender
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

        // 2. Notify Admins
        const admins = await User.find({ role: { $in: ['ADMIN', 'SUPERADMIN'] }, deletedAt: null });
        const adminNotifications = admins
            .filter(admin => admin.username !== approverUsername)
            .map(admin => ({
                recipientId: admin._id,
                targetRoles: ['ADMIN', 'SUPERADMIN'],
                title: 'Request Denied',
                message: `${approverUsername} denied a request from ${request.senderUsername}. Reason: ${denialComment}`,
                type: 'ADMIN_ACTION_ALERT',
                isRead: false
            }));
        if (adminNotifications.length > 0) await Notification.insertMany(adminNotifications);

        res.json({ message: "Denied successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTrashItems = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let query = {};
        if (role?.toUpperCase() === "HOD" || role?.toUpperCase() === "EMPLOYEE") {
            query = { departmentId: new mongoose.Types.ObjectId(departmentId) };
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
        delete data._id; delete data.deletedAt; delete data.originalFileId; delete data.departmentName; delete data.approvedBy; delete data.deletedBy;
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
            query = { departmentId: new mongoose.Types.ObjectId(departmentId) };
        }
        const [pending, completed, denied] = await Promise.all([
            Transfer.countDocuments({ ...query, status: "pending" }),
            Transfer.countDocuments({ ...query, status: "completed" }),
            Transfer.countDocuments({ ...query, status: "denied" })
        ]);
        res.json({ pending, completed, denied });
    } catch (err) { res.status(500).json({ error: err.message }); }
};