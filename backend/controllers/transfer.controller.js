const Transfer = require("../models/Transfer");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const Trash = require("../models/Trash");

// 1. CREATE TRANSFER REQUEST
exports.createRequest = async (req, res) => {
    try {
        const {
            senderUsername,
            senderRole,
            recipientId,
            fileIds,
            reason,
            requestType,
            departmentId
        } = req.body;

        const roleUpper = senderRole?.toUpperCase() || "";
        const isAutoApprove = roleUpper === "ADMIN" || roleUpper === "SUPERADMIN";

        const senderUser = await User.findOne({ username: senderUsername });
        const recipientUser = recipientId ? await User.findById(recipientId) : null;

        const sDept = senderUser ? await Department.findOne({ departmentId: String(senderUser.departmentId) }) : null;
        const rDept = recipientUser ? await Department.findOne({ departmentId: String(recipientUser.departmentId) }) : null;

        const newTransfer = new Transfer({
            senderUsername,
            senderRole,
            recipientId,
            fileIds,
            reason,
            requestType,
            departmentId,
            senderId: senderUser?._id, // Store sender ID for reference
            senderDeptName: sDept?.name || sDept?.departmentName || "N/A",
            receiverDeptName: rDept?.name || rDept?.departmentName || "N/A",
            status: isAutoApprove ? "completed" : "pending"
        });

        if (isAutoApprove) {
            if (requestType === "delete") {
                await handleMoveToTrash(fileIds, senderUsername, "AUTO-ADMIN", departmentId);
            } else if (requestType === "transfer") {
                // Change ownership immediately for Auto-Approve
                await File.updateMany(
                    { _id: { $in: fileIds } },
                    { 
                        $set: { 
                            uploadedBy: recipientId, 
                            senderId: senderUser?._id, // Keep original owner in senderId
                            updatedAt: new Date(),
                            transferStatus: 'received' 
                        }, 
                        $addToSet: { sharedWith: recipientId } 
                    }
                );
                await Folder.updateMany(
                    { _id: { $in: fileIds } },
                    { $set: { uploadedBy: recipientId, updatedAt: new Date() } }
                );
            }
        } else {
            // NOTIFY ADMINS/HOD
            const staffToNotify = await User.find({
                $or: [
                    { role: { $in: ['Admin', 'SuperAdmin', 'ADMIN', 'SUPERADMIN'] } },
                    { role: 'HOD', departmentId: departmentId }
                ]
            });

            if (staffToNotify.length > 0) {
                const notificationEntries = staffToNotify
                    .filter(staff => staff.username !== senderUsername)
                    .map(staff => ({
                        recipientId: staff._id,
                        title: 'New Request Pending',
                        message: `A new ${requestType} request has been created by ${senderUsername}.`,
                        type: 'REQUEST_NEW',
                        isRead: false
                    }));
                await Notification.insertMany(notificationEntries);
            }
        }

        await newTransfer.save();
        res.status(201).json({
            message: isAutoApprove ? "Action completed immediately" : "Request sent for approval",
            transfer: newTransfer
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. GET DASHBOARD (PENDING + HISTORY)
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, search = "", pPage = 1, hPage = 1, limit = 10 } = req.query;
        const roleUpper = role?.toUpperCase() || "";
        const searchRegex = new RegExp(search, "i");

        const searchFilter = {
            $or: [
                { senderUsername: { $regex: searchRegex } },
                { reason: { $regex: searchRegex } },
            ],
        };

        let pendingQuery = { status: "pending", ...searchFilter };
        let historyQuery = { status: { $ne: "pending" }, ...searchFilter };

        if (roleUpper === "HOD") {
            pendingQuery = {
                ...pendingQuery,
                $or: [
                    { departmentId: departmentId, senderRole: "EMPLOYEE" },
                    { senderUsername: username }
                ]
            };
            historyQuery.departmentId = departmentId;
        } else if (roleUpper === "EMPLOYEE") {
            pendingQuery.senderUsername = username;
            historyQuery.senderUsername = username;
        }

        const pendingSkip = (parseInt(pPage) - 1) * parseInt(limit);
        const historySkip = (parseInt(hPage) - 1) * parseInt(limit);

        const [rawMain, totalPending, rawLogs, totalHistory] = await Promise.all([
            Transfer.find(pendingQuery).sort({ createdAt: -1 }).skip(pendingSkip).limit(parseInt(limit)).populate("fileIds").populate("recipientId", "username departmentId").lean(),
            Transfer.countDocuments(pendingQuery),
            Transfer.find(historyQuery).sort({ updatedAt: -1 }).skip(historySkip).limit(parseInt(limit)).populate("fileIds").populate("recipientId", "username departmentId").lean(),
            Transfer.countDocuments(historyQuery),
        ]);

        const processData = async (list) => {
            return Promise.all(list.map(async (item) => {
                const sUser = await User.findOne({ username: item.senderUsername });
                let sDeptFinal = "N/A";
                if (sUser) {
                    const d = await Department.findOne({ departmentId: String(sUser.departmentId) });
                    sDeptFinal = d?.name || d?.departmentName || "N/A";
                }
                let rDeptFinal = "N/A";
                if (item.recipientId && item.recipientId.departmentId) {
                    const d = await Department.findOne({ departmentId: String(item.recipientId.departmentId) });
                    rDeptFinal = d?.name || d?.departmentName || "N/A";
                }
                return { ...item, senderDeptName: sDeptFinal, receiverDeptName: rDeptFinal, isActionable: item.senderUsername !== username };
            }));
        };

        res.json({
            mainRequests: await processData(rawMain),
            logs: await processData(rawLogs),
            totalPending,
            totalHistory,
            pendingTotalPages: Math.ceil(totalPending / limit),
            historyTotalPages: Math.ceil(totalHistory / limit),
            currentPendingPage: parseInt(pPage),
            currentHistoryPage: parseInt(hPage),
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. APPROVE HANDLER
exports.approveTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { approverUsername } = req.body;

        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Request not found" });

        const senderUser = await User.findOne({ username: transfer.senderUsername });

        if (transfer.requestType === "delete") {
            await handleMoveToTrash(transfer.fileIds, transfer.senderUsername, approverUsername || "Authorized User", transfer.departmentId);
        } else {
            // THE FIX: When transferring, we update the uploadedBy but keep the senderId
            await File.updateMany(
                { _id: { $in: transfer.fileIds } },
                { 
                    $set: { 
                        uploadedBy: transfer.recipientId, 
                        senderId: senderUser?._id, // IMPORTANT: Allows sender to still see it
                        updatedAt: new Date(),
                        transferStatus: 'received' // This prevents it from being hidden by the 'none' filter
                    }, 
                    $addToSet: { sharedWith: transfer.recipientId } 
                }
            );

            await Folder.updateMany(
                { _id: { $in: transfer.fileIds } },
                { $set: { uploadedBy: transfer.recipientId, updatedAt: new Date() } }
            );
        }

        transfer.status = "completed";
        await transfer.save();

        // NOTIFICATIONS
        const sender = await User.findOne({ username: transfer.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Approved',
                message: `Your ${transfer.requestType} request has been approved by ${approverUsername}.`,
                type: 'REQUEST_APPROVED',
                isRead: false
            });
        }

        if (transfer.recipientId) {
            await Notification.create({
                recipientId: transfer.recipientId,
                title: 'Files Received',
                message: `You have received new files from ${transfer.senderUsername}.`,
                type: 'FILES_RECEIVED',
                isRead: false
            });
        }

        res.status(200).json({ message: "Request approved and processed" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. DENY HANDLER
exports.denyTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { denialComment, approverUsername } = req.body;

        const transfer = await Transfer.findByIdAndUpdate(transferId, {
            status: "denied",
            denialComment: denialComment || "No specific reason"
        }, { new: true });

        if (!transfer) return res.status(404).json({ message: "Request not found" });

        const sender = await User.findOne({ username: transfer.senderUsername });
        if (sender) {
            await Notification.create({
                recipientId: sender._id,
                title: 'Request Denied',
                message: `Your ${transfer.requestType} request was denied. Reason: ${denialComment || "N/A"}`,
                type: 'REQUEST_DENIED',
                isRead: false
            });
        }

        res.status(200).json({ message: "Request denied successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. GET RECEIVED FILES
exports.getReceivedFiles = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const [files, folders] = await Promise.all([
            File.find({ uploadedBy: userId }).lean(),
            Folder.find({ uploadedBy: userId }).lean()
        ]);

        res.json({ files, folders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. PRIVATE HELPER: MOVE TO TRASH
async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const fileId of files) {
        const fileData = await File.findById(fileId);
        if (!fileData) continue;
        
        await Trash.create({
            originalName: fileData.originalName,
            path: fileData.path,
            size: fileData.size,
            mimetype: fileData.mimeType, 
            originalFileId: fileData._id,
            deletedBy: sender,
            approvedBy: approver,
            departmentId: deptId,
            reason: "Approved Request"
        });
        
        await File.findByIdAndDelete(fileId);
    }
}