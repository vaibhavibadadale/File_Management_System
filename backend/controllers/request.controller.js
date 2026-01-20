import Transfer from "../models/Transfer.js";
import DeleteRequest from "../models/DeleteRequest.js";
import File from "../models/File.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Notification from "../models/Notification.js";
import Trash from "../models/Trash.js";
import mongoose from "mongoose";

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

export const createRequest = async (req, res) => {
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
    // PASTE THE NOTIFICATION ENGINE HERE
    try {
        const hodeDeptId = finalDeptId ? new mongoose.Types.ObjectId(finalDeptId) : null;

        const staffToNotify = await User.find({
            $or: [
                { role: { $in: ['ADMIN', 'SUPERADMIN'] } },
                { role: 'HOD', departmentId: hodeDeptId }
            ],
            deletedAt: null
        });

        const notificationEntries = staffToNotify
            .filter(u => u.username !== senderUsername)
            .map(u => ({
                recipientId: u._id,
                targetRoles: ['ADMIN', 'SUPERADMIN', 'HOD'],
                department: sDeptName, // Match the string filtering in your Notification Controller
                departmentId: finalDeptId, 
                title: `New ${requestType.toUpperCase()} Request`,
                message: `${senderUsername} (${sDeptName}) requested a ${requestType}.`,
                type: requestType === 'delete' ? 'DELETE_REQUEST' : 'TRANSFER_REQUEST',
                isRead: false
            }));

        if (notificationEntries.length > 0) {
            await Notification.insertMany(notificationEntries);
            console.log(`✅ Notifications sent to ${notificationEntries.length} staff members.`);
        }
    } catch (nErr) { 
        console.error("❌ Notification Engine Error:", nErr); 
    }
}

// Final response at the very end of the function
res.status(201).json({ message: "Success", data: newRequest });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};
// 2. GET DASHBOARD
export const getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, search = "", pPage = 1, hPage = 1, limit = 5 } = req.query;
        const roleUpper = role?.toUpperCase();
        const searchRegex = new RegExp(search, "i");

        let filter = {};

        // 1. ROLE-BASED FILTERING
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

        // 2. SEARCH LOGIC
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

        // 3. FETCH DATA (Fetch everything to filter by status)
        const [transfers, deletes] = await Promise.all([
            Transfer.find(filter).populate("fileIds").lean(),
            DeleteRequest.find(filter).populate("fileIds").lean()
        ]);

        const combined = [...transfers, ...deletes];

        // 4. SEPARATE BY STATUS
        const mainRequests = combined
            .filter(r => r.status === "pending")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const logs = combined
            .filter(r => r.status !== "pending")
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        // 5. PAGINATION CALCULATIONS
        const pLimit = parseInt(limit);
        const currentPageP = parseInt(pPage);
        const currentPageH = parseInt(hPage);

        const pStart = (currentPageP - 1) * pLimit;
        const hStart = (currentPageH - 1) * pLimit;

        // 6. FINAL RESPONSE
        res.json({
            // Slice the data for the current page
            mainRequests: mainRequests.slice(pStart, pStart + pLimit).map(r => ({
                ...r, 
                isActionable: r.senderUsername !== username
             })),
            logs: logs.slice(hStart, hStart + pLimit),

            // Total counts for labels
            totalPending: mainRequests.length,
            totalHistory: logs.length,

            // CALCULATE TOTAL PAGES (Crucial for fixing the NaN issue)
            pendingTotalPages: Math.ceil(mainRequests.length / pLimit) || 1,
            historyTotalPages: Math.ceil(logs.length / pLimit) || 1
        });

    } catch (err) { 
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: err.message }); 
    }
};

// 3. APPROVE REQUEST
export const approveRequest = async (req, res) => {
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
            await File.updateMany(
                { _id: { $in: idsOnly } }, 
                { $addToSet: { sharedWith: request.recipientId } }
            );
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

        res.json({ message: "Approved successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. DENY REQUEST
export const denyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { denialComment } = req.body;

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

// 5. TRASH ITEMS
export const getTrashItems = async (req, res) => {
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

// 6. RESTORE
export const restoreFromTrash = async (req, res) => {
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

        res.json({ message: "File restored successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 7. PERMANENT DELETE
export const permanentDelete = async (req, res) => {
    try {
        await Trash.findByIdAndDelete(req.params.id);
        res.json({ message: "File permanently deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 8. STATS
export const getDashboardStats = async (req, res) => {
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