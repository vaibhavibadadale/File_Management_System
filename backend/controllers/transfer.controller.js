const Transfer = require('../models/Transfer'); 
const File = require('../models/File');
const User = require('../models/User');

// 1. CREATE REQUEST / DIRECT TRANSFER
exports.createRequest = async (req, res) => {
    const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
    try {
        const user = await User.findOne({ username: senderUsername });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role.toUpperCase());
        
        // If Admin, status is 'completed' immediately, else 'pending'
        const status = isAdmin ? 'completed' : 'pending';

        const newRequest = new Transfer({
            fileIds,
            senderUsername: user.username,
            senderDepartment: user.departmentId,
            recipientId: requestType === 'delete' ? null : recipientId,
            reason: reason || (isAdmin ? "Direct Admin Action" : "No reason provided"),
            requestType: requestType || 'transfer',
            status,
            departmentId: user.departmentId,
            transferDate: new Date()
        });

        await newRequest.save();

        // --- DIRECT ACTION LOGIC ---
        if (isAdmin) {
            if (requestType === 'delete') {
                await File.deleteMany({ _id: { $in: fileIds } });
            } else {
                // Perform the transfer immediately without HOD approval
                await File.updateMany(
                    { _id: { $in: fileIds } }, 
                    { $set: { uploadedBy: recipientId } }
                );
            }
            return res.status(200).json({ message: "Action executed directly by Admin", direct: true });
        }

        res.status(200).json({ message: "Request sent for approval", direct: false });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 2. FETCH DASHBOARD (GET)
exports.getPendingTransfers = async (req, res) => {
    try {
        const { role, username, departmentId } = req.query;
        const roleUpper = role?.toUpperCase();

        const mySentRequests = await Transfer.find({ senderUsername: username })
            .populate('recipientId', 'username')
            .populate('fileIds', 'originalName filename')
            .sort({ transferDate: -1 });

        let requestsToApprove = [];
        let logs = [];

        if (roleUpper === 'HOD') {
            requestsToApprove = await Transfer.find({ 
                departmentId: departmentId, 
                senderUsername: { $ne: username },
                status: 'pending'
            })
            .populate('recipientId', 'username')
            .populate('fileIds', 'originalName filename');
        } 
        else if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
            // Admins see all pending requests from everyone
            requestsToApprove = await Transfer.find({ status: 'pending' })
                .populate('recipientId', 'username')
                .populate('fileIds', 'originalName filename');
            
            // Audit logs for all completed/denied actions
            logs = await Transfer.find({ status: { $in: ['completed', 'denied'] } })
                .populate('recipientId', 'username')
                .populate('fileIds', 'originalName filename')
                .sort({ transferDate: -1 });
        }

        res.status(200).json({ mySentRequests, requestsToApprove, logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. APPROVE REQUEST (PUT)
exports.approveTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Request not found" });

        if (transfer.requestType === 'delete') {
            await File.deleteMany({ _id: { $in: transfer.fileIds } });
        } else {
            await File.updateMany(
                { _id: { $in: transfer.fileIds } },
                { $set: { uploadedBy: transfer.recipientId } }
            );
        }

        transfer.status = 'completed';
        await transfer.save();
        res.status(200).json({ message: "Approved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. DENY REQUEST (PUT)
exports.denyTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { denialComment } = req.body; 
        
        if (!denialComment) return res.status(400).json({ message: "Reason is required" });

        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Request not found" });

        transfer.status = 'denied';
        // Append comment for the UI split logic
        const currentReason = transfer.reason || "No original reason";
        transfer.reason = `${currentReason} | DENIAL REASON: ${denialComment}`;
        
        await transfer.save();
        res.status(200).json({ message: "Denied successfully" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};