const Request = require("../models/Request");
const User = require("../models/User"); 
const bcrypt = require("bcryptjs");
const File = require("../models/File");
const Folder = require("../models/Folder");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const Trash = require("../models/Trash");
const DeleteRequest = require("../models/DeleteRequest");
const Transfer = require("../models/Transfer");
const EmailLog = require("../models/EmailLog");
const mongoose = require("mongoose");

const { getRecipientsForRequest, notifyApprovers, sendEmail } = require("../utils/emailHelper");
const templates = require("../utils/emailTemplates");

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
            folder: fileData.folder, 
            username: fileData.username, 
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
    if (!recipientId || !fileIds || fileIds.length === 0) return;

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
        
        const isAutoApprove = ["SUPERADMIN", "SUPER_ADMIN"].includes(sRole);

        const mainReq = await new Request({
            requestType: requestType || "transfer",
            fileIds,
            senderUsername: senderUser.username,
            senderRole: sRole,
            senderDeptName: senderUser.departmentId?.departmentName || "General",
            departmentId: finalDeptId,
            recipientId,
            reason: reason || "No reason provided",
            status: isAutoApprove ? "completed" : "pending"
        }).save();

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUser.username, "SYSTEM_AUTO", finalDeptId);
            } else {
                await handleOwnershipTransfer(fileIds, recipientId, senderUser.username);
            }
        } 
        else {
            const recipients = await getRecipientsForRequest(sRole, finalDeptId, senderUser.username);

            if (recipients && recipients.length > 0) {
                // --- ADDED: IN-APP NOTIFICATION LOGIC ---
                const notificationPromises = recipients.map(rec => 
                    Notification.create({
                        recipientId: rec.id || rec._id, // Ensure this matches your recipient object structure
                        title: `New ${requestType?.toUpperCase()} Request`,
                        message: `${senderUser.username} requested a file ${requestType}. Needs your approval.`,
                        type: "APPROVAL_REQUIRED",
                        requestId: mainReq._id,
                        status: "unread"
                    })
                );

                const populatedReq = await Request.findById(mainReq._id).populate('fileIds');
                const fileNamesStr = populatedReq.fileIds
                    .map(f => f.fileName || f.originalName || f.name || "Unnamed File")
                    .join(", ");

                // Run both Email and In-App Notifications in parallel
                await Promise.all([
                    ...notificationPromises,
                    notifyApprovers(recipients, {
                        senderUsername: senderUser.username,
                        requestType: requestType || "transfer",
                        reason: mainReq.reason,
                        requestId: mainReq._id,
                        fileNames: fileNamesStr 
                    })
                ]);
            }
        }

        res.status(201).json({ 
            message: isAutoApprove ? "Request auto-approved" : "Request created & Notifications sent", 
            data: mainReq 
        });

    } catch (err) {
        console.error("Create Request Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.approveFromEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await Request.findById(id);

        if (!request || request.status !== 'pending') {
            return res.status(400).json({ message: "Already processed or not found." });
        }

        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, "Admin (via Email)", request.departmentId);
        } else {
            await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername);
        }

        request.status = "completed";
        request.actionedBy = "Admin (Email)";
        request.actionedAt = new Date();
        await request.save();

        const recipients = await getRecipientsForRequest(request.senderRole, request.departmentId);
        const updateHtml = `<h3>Request Approved</h3>
                           <p>The ${request.requestType} request from <b>${request.senderUsername}</b> has been approved via email link.</p>`;

        await sendEmail(recipients, `Update: Request Approved`, updateHtml, "FOLLOW_UP");

        res.status(200).json({ message: "Approved" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.denyFromEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { denialComment } = req.body; 

        const request = await Request.findById(id);
        if (!request) return res.status(404).json({ message: "Request not found" });
        if (request.status !== "pending") return res.status(400).json({ message: "Already processed" });

        request.status = "denied";
        request.denialReason = denialComment || "Denied via Email quick-link.";
        request.actionedBy = "Admin (Email)";
        request.actionedAt = new Date();
        await request.save();

        const recipients = await getRecipientsForRequest(request.senderRole, request.departmentId);
        const updateHtml = `<h3>Request Denied</h3>
                           <p>The ${request.requestType} request from <b>${request.senderUsername}</b> was denied.</p>
                           <p><b>Reason:</b> ${request.denialReason}</p>`;

        await sendEmail(recipients, `Update: Request Denied`, updateHtml, "FOLLOW_UP");

        res.status(200).json({ message: "Success" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.secureAction = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action, password, userId, comment } = req.body;

        // DEBUG LOGS - Check your terminal to see if these appear
        console.log("SECURE ACTION ATTEMPT:", { requestId, userId, action });

        // 1. Validation
        if (!password || !userId) {
            return res.status(400).json({ message: "Password and User ID are required." });
        }

        const approver = await User.findById(userId).select("+password username email");
        if (!approver) return res.status(404).json({ message: "Approver user not found." });

        const isMatch = await bcrypt.compare(password, approver.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

        const request = await Request.findById(requestId).populate('fileIds');
        if (!request) return res.status(404).json({ message: "Request no longer exists." });
        
        // This is likely what caused your 400 error
        if (request.status !== 'pending') {
            return res.status(400).json({ message: `This request is already ${request.status}.` });
        }

        const isApproved = action === 'approve' || action === 'confirm';
        
        // 2. Update Request State
        request.status = isApproved ? 'completed' : 'rejected';
        request.actionedBy = approver.username;
        request.actionedAt = new Date();
        
        // Save comment as adminComment for the Frontend "Red Box"
        if (!isApproved) {
            request.adminComment = comment || "No reason provided by admin."; 
        }
        
        await request.save();

        // 3. Execute File Operations (Move to Trash or Transfer Ownership)
        if (isApproved) {
            if (request.requestType === "delete") {
                await handleMoveToTrash(request.fileIds, request.senderUsername, approver.username, request.departmentId);
            } else {
                await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername);
            }
        }

        // 4. Notify Sender (Fixing the previous crash)
        const senderUser = await User.findOne({ username: request.senderUsername });
        if (senderUser) {
            await Notification.create({
                recipientId: senderUser._id,
                title: isApproved ? 'Request Approved' : 'Request Rejected',
                message: `Your ${request.requestType} request was ${request.status} by ${approver.username}.`,
                type: isApproved ? 'REQUEST_APPROVED' : 'REQUEST_DENIED'
            });

            // Using standard sendEmail helper to avoid "notifyUserOfAction is not defined" error
            if (senderUser.email && templates.actionUpdateTemplate) {
                const emailHtml = templates.actionUpdateTemplate({
                    senderUsername: senderUser.username,
                    requestType: request.requestType,
                    actionedBy: approver.username,
                    status: request.status,
                    denialReason: comment 
                });
                await sendEmail(senderUser.email, `Request ${request.status.toUpperCase()}`, emailHtml);
            }
        }

        res.status(200).json({ message: `Request ${request.status} successfully.` });

    } catch (err) {
        console.error("CRITICAL ERROR IN SECURE ACTION:", err);
        res.status(500).json({ message: "Server error during processing", error: err.message });
    }
};
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approverUsername = "Admin" } = req.body;

        const request = await Request.findById(id).populate('fileIds');
        if (!request || request.status?.toLowerCase() !== "pending") {
            return res.status(404).json({ message: "Request not found or already processed" });
        }

        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, approverUsername, request.departmentId);
            await DeleteRequest.findOneAndUpdate(
                { senderUsername: request.senderUsername, status: "pending" },
                { status: "completed", updatedAt: new Date() },
                { sort: { createdAt: -1 } }
            );
        } else {
            await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername);
            await Transfer.findOneAndUpdate(
                { senderUsername: request.senderUsername, status: "pending" },
                { status: "completed", updatedAt: new Date() },
                { sort: { createdAt: -1 } }
            );
        }

        request.status = "completed";
        request.actionedBy = approverUsername;
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

            if (sender.email && templates.actionUpdateTemplate) {
                const emailHtml = templates.actionUpdateTemplate({
                    senderUsername: sender.username,
                    requestType: request.requestType,
                    actionedBy: approverUsername,
                    status: 'completed'
                });
                await sendEmail(sender.email, `Request Approved: ${request.requestType}`, emailHtml, "REQUEST_APPROVED", approverUsername);
            }
        }
        res.json({ message: "Approved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.denyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { denialComment = "No reason provided", approverUsername = "Admin" } = req.body;

        const request = await Request.findByIdAndUpdate(id, {
            status: "denied",
            denialComment,
            actionedBy: approverUsername,
            updatedAt: new Date()
        }, { new: true });

        if (!request) return res.status(404).json({ message: "Request not found" });

        const logUpdate = { status: "denied", denialComment, updatedAt: new Date() };
        if (request.requestType === "delete") {
            await DeleteRequest.findOneAndUpdate(
                { senderUsername: request.senderUsername, status: "pending" },
                logUpdate,
                { sort: { createdAt: -1 } }
            );
        } else {
            await Transfer.findOneAndUpdate(
                { senderUsername: request.senderUsername, status: "pending" },
                logUpdate,
                { sort: { createdAt: -1 } }
            );
        }

        const sender = await User.findOne({ username: request.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Denied',
                message: `Your request was denied by ${approverUsername}.`,
                type: 'REQUEST_DENIED'
            });

            if (sender.email && templates.actionUpdateTemplate) {
                const emailHtml = templates.actionUpdateTemplate({
                    senderUsername: sender.username,
                    requestType: request.requestType,
                    actionedBy: approverUsername,
                    status: 'denied',
                    denialReason: denialComment 
                });
                await sendEmail(sender.email, `Request Denied: ${request.requestType}`, emailHtml, "REQUEST_DENIED", approverUsername);
            }
        }
        res.json({ message: "Denied successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, departmentId, username, pPage = 1, hPage = 1, limit = 5, search = "" } = req.query;
        const skipP = (parseInt(pPage) - 1) * parseInt(limit);
        const skipH = (parseInt(hPage) - 1) * parseInt(limit);

        let pendingFilter = { status: "pending" };
        let historyFilter = { status: { $in: ["completed", "denied", "rejected"] } };

        if (role === "HOD") {
            pendingFilter = {
                $or: [
                    { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] }, status: "pending" },
                    { senderUsername: username, status: "pending" }
                ]
            };
        } else if (!["ADMIN", "SUPERADMIN", "SUPER_ADMIN"].includes(role)) {
            pendingFilter = { senderUsername: username, status: "pending" };
        }

        if (search) {
            pendingFilter.reason = { $regex: search, $options: "i" };
        }

        const [mainRequests, totalPending, logs, totalHistory] = await Promise.all([
            Request.find(pendingFilter)
                .sort({ createdAt: -1 }).skip(skipP).limit(parseInt(limit))
                .populate('fileIds') // <--- FIXED: Now pulls file names for Approval table
                .populate({
                    path: 'recipientId',
                    select: 'username role departmentId',
                    populate: { path: 'departmentId', select: 'departmentName' }
                }),
            Request.countDocuments(pendingFilter),
            Request.find(historyFilter)
                .sort({ updatedAt: -1 }).skip(skipH).limit(parseInt(limit))
                .populate('fileIds') // <--- FIXED: Now pulls file names for History table
                .populate({
                    path: 'recipientId',
                    select: 'username role departmentId',
                    populate: { path: 'departmentId', select: 'departmentName' }
                }),
            Request.countDocuments(historyFilter)
        ]);

        res.json({
            mainRequests,
            totalPending,
            pendingTotalPages: Math.ceil(totalPending / limit),
            logs,
            totalHistory,
            historyTotalPages: Math.ceil(totalHistory / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTrashItems = async (req, res) => {
    try {
        const { role, departmentId, username } = req.query;
        const roleUpper = role?.toUpperCase();
        let query = {};

        if (roleUpper === "SUPERADMIN" || roleUpper === "SUPER_ADMIN") query = {}; 
        else if (roleUpper === "ADMIN") query = { $or: [{ senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } }, { deletedBy: username }] };
        else if (roleUpper === "HOD") query = { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } };
        else query = { deletedBy: username };

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
        const trashMetadata = ['_id', 'deletedAt', 'originalFileId', 'departmentName', 'approvedBy', 'deletedBy', 'reason', 'senderRole', '__v', 'createdAt', 'updatedAt'];
        trashMetadata.forEach(key => delete data[key]);

        await File.create({ ...data, _id: originalId, deletedAt: null });
        await Trash.findByIdAndDelete(req.params.id);
        res.json({ message: "File restored successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

exports.updateRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, remarks, actionBy } = req.body;
        const request = await Request.findByIdAndUpdate(requestId, { status, remarks, actionBy, updatedAt: new Date() }, { new: true });

        if (!request) return res.status(404).json({ message: "Request not found" });

        const sender = await User.findOne({ username: request.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: `Request ${status.toUpperCase()}`,
                message: `Your request for ${request.fileName} was ${status} by ${actionBy}.`,
                type: "REQUEST_STATUS_UPDATE"
            });
        }
        res.json({ message: `Request ${status} successfully`, request });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.restoreAllTrash = async (req, res) => {
    try {
        const { role, departmentId, username } = req.query;
        const roleUpper = role?.toUpperCase();
        let query = {};

        if (roleUpper === "SUPERADMIN" || roleUpper === "SUPER_ADMIN") query = {};
        else if (roleUpper === "ADMIN") query = { $or: [{ senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } }, { deletedBy: username }] };
        else if (roleUpper === "HOD") query = { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } };
        else query = { deletedBy: username };

        const items = await Trash.find(query);
        for (const item of items) {
            const data = item.toObject();
            const originalId = data.originalFileId;
            const trashMetadata = ['_id', 'deletedAt', 'originalFileId', 'departmentName', 'approvedBy', 'deletedBy', 'reason', 'senderRole', '__v', 'createdAt', 'updatedAt'];
            trashMetadata.forEach(key => delete data[key]);
            await File.create({ ...data, _id: originalId, deletedAt: null });
            await Trash.findByIdAndDelete(item._id);
        }
        res.json({ message: `Restored ${items.length} files.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.emptyTrash = async (req, res) => {
    try {
        const { role, departmentId, username } = req.query;
        const roleUpper = role?.toUpperCase();
        let query = {};

        if (roleUpper === "SUPERADMIN" || roleUpper === "SUPER_ADMIN") query = {};
        else if (roleUpper === "ADMIN") query = { $or: [{ senderRole: { $in: ["HOD", "EMPLOYEE", "USER"] } }, { deletedBy: username }] };
        else if (roleUpper === "HOD") query = { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] } };
        else query = { deletedBy: username };

        const result = await Trash.deleteMany(query);
        res.json({ message: `Deleted ${result.deletedCount} items.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getEmailLogs = async (req, res) => {
    try {
        const logs = await EmailLog.find().sort({ sentAt: -1 }).limit(100);
        res.json(logs);
    } catch (err) { res.status(500).json({ error: err.message }); }
};