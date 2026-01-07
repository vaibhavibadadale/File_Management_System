const Request = require("../models/Request");
const File = require("../models/File");
const User = require("../models/User");
const Department = require("../models/Department");

// @desc Create Request (Admin direct action)
exports.createRequest = async (req, res) => {
    try {
        const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
        const user = await User.findOne({ username: senderUsername });
        if (!user) return res.status(404).json({ error: "User not found" });

        const dept = await Department.findOne({ 
            $or: [{ _id: user.departmentId }, { code: user.departmentId }] 
        });

        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role.toUpperCase());

        const newReq = new Request({
            requestType: requestType || 'transfer',
            fileIds,
            senderUsername: user.username,
            senderDepartment: dept ? dept.name : "General Office", 
            departmentId: user.departmentId, 
            recipientId: requestType === 'delete' ? null : recipientId,
            reason: reason || (isAdmin ? "Direct Admin Action" : "No reason provided"),
            status: isAdmin ? 'completed' : 'pending' 
        });

        if (isAdmin) {
            if (requestType === 'delete') {
                await File.deleteMany({ _id: { $in: fileIds } });
            } else {
                await File.updateMany({ _id: { $in: fileIds } }, { $set: { uploadedBy: recipientId } });
            }
        }

        await newReq.save();
        res.status(201).json(newReq);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc Process Approval or Denial
exports.handleRequestAction = async (req, res) => {
    try {
        const { action, id } = req.params;
        const { denialComment } = req.body; 

        const transferRequest = await Request.findById(id);
        if (!transferRequest) return res.status(404).json({ error: "Request not found" });

        if (action === 'approve') {
            if (transferRequest.requestType === 'delete') {
                await File.deleteMany({ _id: { $in: transferRequest.fileIds } });
            } else {
                await File.updateMany(
                    { _id: { $in: transferRequest.fileIds } },
                    { $set: { uploadedBy: transferRequest.recipientId } }
                );
            }
            transferRequest.status = 'completed';
        } 
        else if (action === 'deny') {
            transferRequest.status = 'denied';
            // Append denial comment to reason for logging
            const currentReason = transferRequest.reason || "No original reason";
            transferRequest.reason = `${currentReason} | DENIAL REASON: ${denialComment || "No comment provided"}`;
        } 
        else {
            // This prevents the 400 error by catching invalid action strings
            return res.status(400).json({ error: "Invalid action type. Must be 'approve' or 'deny'." });
        }

        await transferRequest.save();
        return res.status(200).json({ message: `Successfully ${action}d` });
    } catch (error) {
        console.error("Action Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// @desc Dashboard Fetch
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId } = req.query;
        const pop = [{ path: 'recipientId', select: 'username' }, { path: 'fileIds', select: 'originalName filename' }];
        
        const mySentRequests = await Request.find({ senderUsername: username }).populate(pop).sort({ createdAt: -1 });
        let requestsToApprove = [];
        let logs = [];

        if (['ADMIN', 'SUPER_ADMIN'].includes(role?.toUpperCase())) {
            requestsToApprove = await Request.find({ status: 'pending' }).populate(pop);
            logs = await Request.find({ status: { $ne: 'pending' } }).populate(pop).limit(50);
        } else if (role?.toUpperCase() === 'HOD') {
            requestsToApprove = await Request.find({ departmentId, senderUsername: { $ne: username }, status: 'pending' }).populate(pop);
        }
        res.json({ mySentRequests, requestsToApprove, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};