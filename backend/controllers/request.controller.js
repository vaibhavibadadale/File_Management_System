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

async function handleOwnershipTransfer(fileIds, recipientId, senderUsername, receiverDeptId = null) {
    if (!recipientId || !fileIds || fileIds.length === 0) return;

    const idsOnly = fileIds.map(f => (f._id ? f._id : f));
    const senderUser = await User.findOne({ username: senderUsername });
    const senderId = senderUser ? senderUser._id : null;

    const updatePayload = {
        uploadedBy: recipientId,
        transferStatus: 'received',
        senderId: senderId,
        lastTransferDate: new Date()
    };

    if (receiverDeptId) {
        updatePayload.departmentId = receiverDeptId;
    }

    const updateOps = {
        $set: updatePayload,
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
                const notificationPromises = recipients.map(rec =>
                    Notification.create({
                        recipientId: rec.id || rec._id,
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
            await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername, request.departmentId);
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

        if (!password || !userId) {
            return res.status(400).json({ message: "Password and User ID are required." });
        }

        const approver = await User.findById(userId).select("+password username email");
        if (!approver) return res.status(404).json({ message: "Approver user not found." });

        const isMatch = await bcrypt.compare(password, approver.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

        const request = await Request.findById(requestId).populate('fileIds');
        if (!request || request.status !== 'pending') {
            return res.status(400).json({ message: "Request already processed or not found." });
        }

        const isApproved = action === 'approve' || action === 'confirm';
        request.status = isApproved ? 'completed' : 'rejected';
        request.actionedBy = approver.username;
        request.actionedAt = new Date();
        if (!isApproved) request.adminComment = comment || "No reason provided.";

        await request.save();

        // EXECUTE LOGIC
        if (isApproved) {
            if (request.requestType === "delete") {
                await handleMoveToTrash(request.fileIds, request.senderUsername, approver.username, request.departmentId);
            } else {
                await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername, request.departmentId);
            }
        }

        // --- ADDED BROADCAST LOGIC HERE ---
        const staff = await getRecipientsForRequest(request.senderRole, request.departmentId, request.senderUsername);
        const sender = await User.findOne({ username: request.senderUsername });
        
        let notifyList = [...staff];
        if (sender) notifyList.push(sender);

        const emailSubject = `Update: Request ${isApproved ? 'Approved' : 'Rejected'} (${request.senderUsername})`;
        const fileNames = request.fileIds.map(f => f.fileName || f.originalName || "File").join(", ");
        
        const emailHtml = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                <h3 style="color: ${isApproved ? '#28a745' : '#dc3545'};">Request ${isApproved ? 'Approved' : 'Rejected'}</h3>
                <p><b>Type:</b> ${request.requestType.toUpperCase()}</p>
                <p><b>Files:</b> ${fileNames}</p>
                <p><b>Actioned By:</b> ${approver.username}</p>
                ${!isApproved ? `<p><b>Reason:</b> ${comment}</p>` : ''}
            </div>`;

        for (const person of notifyList) {
            if (person.email && person.username !== approver.username) {
                await sendEmail(person.email, emailSubject, emailHtml);
            }
        }
        // ---------------------------------

        res.status(200).json({ message: `Request ${request.status} successfully.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
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

        // 1. CORE LOGIC PROCESSING
        if (request.requestType === "delete") {
            await handleMoveToTrash(request.fileIds, request.senderUsername, approverUsername, request.departmentId);
            await DeleteRequest.findOneAndUpdate(
                { senderUsername: request.senderUsername, status: "pending" },
                { status: "completed", updatedAt: new Date() },
                { sort: { createdAt: -1 } }
            );
        } else {
            await handleOwnershipTransfer(request.fileIds, request.recipientId, request.senderUsername, request.departmentId);
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

        // 2. BROADCAST UPDATES TO ALL STAKEHOLDERS
        // Find Admins using case-insensitive search to ensure they are NOT missed
        const allAdmins = await User.find({ role: { $regex: /admin/i } });
        // Find the specific HOD/Approvers for the department
        const staffRecipients = await getRecipientsForRequest(request.senderRole, request.departmentId, request.senderUsername);
        // Find the sender
        const sender = await User.findOne({ username: request.senderUsername });

        // Merge all potential stakeholders
        let finalRecipientList = [...allAdmins, ...staffRecipients];
        if (sender) finalRecipientList.push(sender);

        // Deduplicate by email and remove only the person who performed the action
        const seenEmails = new Set();
        const peopleToNotify = finalRecipientList.filter(u => {
            const email = u.email?.toLowerCase().trim();
            if (!email || seenEmails.has(email)) return false;
            seenEmails.add(email);
            
            // Do not send to the person who just clicked 'Approve'
            return u.username?.toLowerCase() !== approverUsername?.toLowerCase();
        });

        console.log(`[Email Broadcast] Notifying ${peopleToNotify.length} stakeholders about Approval.`);

        const emailSubject = `Update: Request Approved (${request.senderUsername})`;
        const fileNames = request.fileIds.map(f => f.fileName || f.originalName || f.filename || "File").join(", ");
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #e1e1e1; padding: 20px; max-width: 600px;">
                <h3 style="color: #28a745;">Request Approved</h3>
                <p>The <b>${request.requestType.toUpperCase()}</b> request has been processed successfully.</p>
                <p><b>Files:</b> ${fileNames}</p>
                <p><b>Sender:</b> ${request.senderUsername}</p>
                <p><b>Approved By:</b> ${approverUsername}</p>
                <hr/>
                <p style="font-size: 11px; color: #999;">Aaryans File Management System</p>
            </div>
        `;

        for (const person of peopleToNotify) {
            try {
                await sendEmail(person.email, emailSubject, emailHtml);
                console.log(`- Success: Email sent to ${person.email} (${person.role})`);
            } catch (mailErr) {
                console.error(`- Failed: Email to ${person.email}:`, mailErr.message);
            }
        }

        // 3. IN-APP NOTIFICATION FOR SENDER
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Approved',
                message: `Your ${request.requestType} request was approved by ${approverUsername}.`,
                type: 'REQUEST_APPROVED'
            });
        }

        res.json({ message: "Approved successfully and stakeholders notified." });

    } catch (err) {
        console.error("Approval Error:", err);
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
        }, { new: true }).populate('fileIds');

        if (!request) return res.status(404).json({ message: "Request not found" });

        const logUpdate = { status: "denied", denialComment, updatedAt: new Date() };
        if (request.requestType === "delete") {
            await DeleteRequest.findOneAndUpdate({ senderUsername: request.senderUsername, status: "pending" }, logUpdate, { sort: { createdAt: -1 } });
        } else {
            await Transfer.findOneAndUpdate({ senderUsername: request.senderUsername, status: "pending" }, logUpdate, { sort: { createdAt: -1 } });
        }

        // 2. BROADCAST DENIAL TO ALL STAKEHOLDERS
        const allAdmins = await User.find({ role: { $regex: /admin/i } });
        const staffRecipients = await getRecipientsForRequest(request.senderRole, request.departmentId, request.senderUsername);
        const sender = await User.findOne({ username: request.senderUsername });

        let finalRecipientList = [...allAdmins, ...staffRecipients];
        if (sender) finalRecipientList.push(sender);

        const seenEmails = new Set();
        const peopleToNotify = finalRecipientList.filter(u => {
            const email = u.email?.toLowerCase().trim();
            if (!email || seenEmails.has(email)) return false;
            seenEmails.add(email);
            return u.username?.toLowerCase() !== approverUsername?.toLowerCase();
        });

        console.log(`[Email Broadcast] Notifying ${peopleToNotify.length} stakeholders about Denial.`);

        const emailSubject = `Update: Request Denied (${request.senderUsername})`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #e1e1e1; padding: 20px; max-width: 600px;">
                <h3 style="color: #dc3545;">Request Denied</h3>
                <p>The <b>${request.requestType.toUpperCase()}</b> request from <b>${request.senderUsername}</b> was denied.</p>
                <p><b>Reason:</b> ${denialComment}</p>
                <p><b>Denied By:</b> ${approverUsername}</p>
                <hr/>
                <p style="font-size: 11px; color: #999;">Aaryans File Management System</p>
            </div>
        `;

        for (const person of peopleToNotify) {
            try {
                await sendEmail(person.email, emailSubject, emailHtml);
            } catch (mailErr) {
                console.error(`- Failed to send denial email to ${person.email}`);
            }
        }

        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Denied',
                message: `Your request was denied by ${approverUsername}. Reason: ${denialComment}`,
                type: 'REQUEST_DENIED'
            });
        }

        res.json({ message: "Denied successfully and stakeholders notified." });
    } catch (err) {
        console.error("Denial Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, departmentId, username, pPage = 1, hPage = 1, limit = 5, search = "" } = req.query;
        const skipP = (parseInt(pPage) - 1) * parseInt(limit);
        const skipH = (parseInt(hPage) - 1) * parseInt(limit);

        // --- FILTER LOGIC ---
        let pendingFilter = { status: "pending" };
        let historyFilter = { status: { $in: ["completed", "denied", "rejected"] } };

        const upperRole = role?.toUpperCase();

        if (upperRole === "HOD") {
            // HOD Pending: See dept employees' requests or their own
            pendingFilter.$or = [
                { departmentId: departmentId, senderRole: { $in: ["EMPLOYEE", "USER"] }, status: "pending" },
                { senderUsername: username, status: "pending" }
            ];
            // HOD History: See their own history or history of their department
            historyFilter.$and = [
                { status: { $in: ["completed", "denied", "rejected"] } },
                { 
                    $or: [
                        { departmentId: departmentId }, 
                        { senderUsername: username }
                    ] 
                }
            ];
        } 
        else if (!["ADMIN", "SUPERADMIN", "SUPER_ADMIN"].includes(upperRole)) {
            // Employee Pending: Only their own
            pendingFilter = { senderUsername: username, status: "pending" };
            // Employee History: Only their own
            historyFilter = { 
                senderUsername: username, 
                status: { $in: ["completed", "denied", "rejected"] } 
            };
        }
        // If Admin/SuperAdmin, historyFilter stays as the global default (everything)

        // --- SEARCH LOGIC (Only applied to Pending as per your original code) ---
        if (search) {
            pendingFilter.reason = { $regex: search, $options: "i" };
        }

        // --- DATABASE QUERIES (Keep your existing Promise.all logic) ---
        const [mainRequests, totalPending, logs, totalHistory] = await Promise.all([
            Request.find(pendingFilter)
                .sort({ createdAt: -1 }).skip(skipP).limit(parseInt(limit))
                .populate('fileIds')
                .populate({
                    path: 'recipientId',
                    select: 'username role departmentId',
                    populate: { path: 'departmentId', select: 'departmentName' }
                }),
            Request.countDocuments(pendingFilter),
            Request.find(historyFilter)
                .sort({ updatedAt: -1 }).skip(skipH).limit(parseInt(limit))
                .populate('fileIds')
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

// UPDATED CONTROLLER: Added 'role' to populate calls
exports.getReceivedFiles = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Valid User ID is required" });
        }

        const filter = { 
            uploadedBy: userId, 
            transferStatus: 'received',
            deletedAt: null 
        };

        const [files, folders] = await Promise.all([
            File.find(filter)
                .populate('senderId', 'username email role') // Added 'role' here
                .sort({ lastTransferDate: -1 })
                .lean(),
            Folder.find(filter)
                .populate('senderId', 'username email role') // Added 'role' here
                .sort({ lastTransferDate: -1 })
                .lean()
        ]);

        res.json({ 
            message: "Received items fetched successfully",
            count: files.length + folders.length,
            data: { files, folders } 
        });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
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