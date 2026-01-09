const Transfer = require('../models/Transfer'); 
const File = require('../models/File');
const Folder = require('../models/Folder'); 
const User = require('../models/User');

exports.createRequest = async (req, res) => {
    const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
    try {
        const dbUser = await User.findOne({ username: senderUsername });
        if (!dbUser) return res.status(404).json({ message: "User not found" });

        const roleUpper = dbUser.role.toUpperCase().replace(/_/g, "").trim();
        const isPrivileged = ['ADMIN', 'SUPERADMIN'].includes(roleUpper);
        
        // 1. Status is 'completed' for Admins, 'pending' for others
        const status = isPrivileged ? 'completed' : 'pending';

        const newRequest = new Transfer({
            fileIds,
            senderUsername: dbUser.username,
            senderRole: roleUpper,
            senderDepartment: dbUser.departmentId,
            recipientId: requestType === 'delete' ? null : recipientId,
            reason: reason || (isPrivileged ? "Direct Admin Action" : "No reason provided"),
            requestType: requestType || 'transfer',
            status,
            transferDate: new Date()
        });

        if (isPrivileged) {
            // Execute Database changes immediately
            if (requestType === 'delete') {
                await File.deleteMany({ _id: { $in: fileIds } });
                await Folder.deleteMany({ _id: { $in: fileIds } });
            } else {
                await File.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
                await Folder.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
            }
            await newRequest.save();
            // 2. Specific message for Admin
            return res.status(200).json({ message: "Transferred Successfully", direct: true });
        }

        await newRequest.save();
        // 2. Specific message for Employee/HOD
        res.status(200).json({ message: "Transfer request sent successfully", direct: false });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};
// 2. FETCH DASHBOARD (Updated visibility logic)
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId } = req.query;
        const roleUpper = role ? role.toUpperCase() : "";
        
        let mainQuery = {}; 
        let logQuery = {}; 

        if (roleUpper === "SUPERADMIN" || roleUpper === "ADMIN") {
            // Admins/SuperAdmins see EVERYTHING except their own requests
            mainQuery = { status: "pending", senderUsername: { $ne: username } };
            // Global history log
            logQuery = {}; 
        } 
        else if (roleUpper === "HOD") {
            // RULE: HODs only see requests from their department's EMPLOYEES
            // HOD's own requests will be filtered out here and seen by Admins instead
            mainQuery = { 
                status: "pending", 
                departmentId: departmentId, 
                senderUsername: { $ne: username },
                senderRole: "EMPLOYEE" 
            };
            // History: Only see their department's actions
            logQuery = { departmentId: departmentId };
        } 
        else {
            // Employees see nothing on the Action Dashboard
            return res.json({ mainRequests: [], logs: [], totalMain: 0, totalLogs: 0 });
        }

        // We populate fileIds to show names, and recipientId to show where it's going
        const mainRequests = await Transfer.find(mainQuery)
            .populate("fileIds")
            .populate("recipientId", "username");

        const logs = await Transfer.find(logQuery)
            .sort({ createdAt: -1 })
            .populate("fileIds")
            .populate("recipientId", "username");

        res.json({
            mainRequests,
            logs,
            totalMain: mainRequests.length,
            totalLogs: logs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Logic to handle Approve/Deny
exports.handleAction = async (req, res) => {
    try {
        const { action, id } = req.params;
        const status = action === "approve" ? "completed" : "denied";
        
        const updated = await Transfer.findByIdAndUpdate(
            id, 
            { status: status }, 
            { new: true }
        );
        
        res.json({ message: `Request ${action}d successfully`, updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// 3. APPROVE REQUEST
exports.approveTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Request not found" });

        if (transfer.requestType === 'delete') {
            await File.deleteMany({ _id: { $in: transfer.fileIds } });
            await Folder.deleteMany({ _id: { $in: transfer.fileIds } });
        } else {
            // UPDATE: Use $addToSet to add receiver to access list
            // Original uploadedBy remains the same, so it stays in sender's profile
            await File.updateMany(
                { _id: { $in: transfer.fileIds } },
                { $addToSet: { sharedWith: transfer.recipientId } }
            );
            // Update Folders
            await Folder.updateMany(
                { _id: { $in: transfer.fileIds } },
                { $addToSet: { sharedWith: transfer.recipientId } }
            );
        }

        transfer.status = 'completed';
        await transfer.save();
        res.status(200).json({ message: "Approved" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. DENY REQUEST
exports.denyTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { denialComment } = req.body; // Captured from window.prompt in frontend
        
        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Request not found" });

        transfer.status = 'denied';
        
        // Save the specific comment to its own field for the frontend
        transfer.denialComment = denialComment || "No comment provided";
        
        // Keep the history in the reason field as you currently do
        const currentReason = transfer.reason || "No original reason";
        transfer.reason = `${currentReason} | DENIAL REASON: ${denialComment || "No comment provided"}`;
        
        await transfer.save();
        res.status(200).json({ message: "Denied successfully" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 5. FETCH RECEIVED FILES FOR MODAL
exports.getReceivedFiles = async (req, res) => {
    try {
        const { recipientId } = req.query;

        if (!recipientId) {
            return res.status(400).json({ message: "Recipient ID is required" });
        }

        const transfers = await Transfer.find({ 
            recipientId: recipientId, 
            status: 'completed' 
        });

        const allFileAndFolderIds = [...new Set(transfers.flatMap(t => t.fileIds))];

        const receivedFiles = await File.find({ _id: { $in: allFileAndFolderIds } });
        const receivedFolders = await Folder.find({ _id: { $in: allFileAndFolderIds } });

        const allItems = [
            ...receivedFolders.map(f => ({ ...f._doc, isFolder: true })),
            ...receivedFiles.map(f => ({ ...f._doc, isFolder: false }))
        ];

        res.status(200).json({ transferredFiles: allItems });
    } catch (err) {
        console.error("Error in getReceivedFiles:", err);
        res.status(500).json({ error: err.message });
    }
};