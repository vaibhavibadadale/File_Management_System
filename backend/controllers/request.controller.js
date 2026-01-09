const Request = require("../models/Request");
const User = require("../models/User");
const Department = require("../models/Department");
const File = require("../models/File");

// 1. CREATE REQUEST
exports.createRequest = async (req, res) => {
    try {
        const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
        
        // Find user to get their role and department
        const user = await User.findOne({ username: senderUsername }).populate('departmentId');
        const roleClean = user.role.toUpperCase().replace(/_/g, "").trim();
        
        // Define privileged roles
        const isPrivileged = ["ADMIN", "SUPERADMIN"].includes(roleClean);

        const newReq = new Request({
            requestType: requestType || 'transfer',
            fileIds,
            senderUsername: user.username,
            senderRole: roleClean,
            senderDepartment: user.departmentId?.name || "General",
            recipientId: requestType === 'delete' ? null : recipientId,
            reason: reason || (isPrivileged ? "Direct Action" : ""),
            status: isPrivileged ? 'completed' : 'pending' 
        });

        // If Admin/SuperAdmin, perform the database action IMMEDIATELY
        if (isPrivileged) {
            if (requestType === 'delete') {
                await File.deleteMany({ _id: { $in: fileIds } });
            } else {
                // Change owner of files to the recipient
                await File.updateMany(
                    { _id: { $in: fileIds } }, 
                    { $set: { uploadedBy: recipientId } }
                );
            }
        }

        await newReq.save();
        
        res.status(201).json({ 
            message: isPrivileged ? "Transfer Successful" : "Transfer Request Sent",
            data: newReq 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. DASHBOARD VISIBILITY LOGIC
exports.getPendingDashboard = async (req, res) => {
    try {
        const { role, username, departmentId, search } = req.query;
        
        // Pagination for Pending (Main)
        const mainStart = parseInt(req.query.mainStart) || 0;
        const mainLength = parseInt(req.query.mainLength) || 10;

        // Pagination for History (Logs)
        const logStart = parseInt(req.query.logStart) || 0;
        const logLength = parseInt(req.query.logLength) || 10;

        const roleUpper = role?.toUpperCase().replace(/_/g, "").trim();
        const dept = await Department.findById(departmentId);
        const userDeptName = dept ? dept.name : "Unknown";

        const pop = [{ path: 'recipientId', select: 'username' }, { path: 'fileIds', select: 'originalName filename' }];

        // 1. Base visibility filter
        let baseFilter = {};
        if (roleUpper === "ADMIN") {
            baseFilter.senderRole = { $ne: 'SUPERADMIN' };
        } else if (roleUpper === "HOD") {
            baseFilter.$or = [{ senderDepartment: userDeptName }, { senderUsername: username }];
        } else if (roleUpper === "EMPLOYEE") {
            baseFilter.senderUsername = username;
        }

        // 2. Search logic
        if (search) {
            baseFilter.$and = [
                { ...baseFilter },
                { $or: [
                    { senderUsername: { $regex: search, $options: 'i' } },
                    { senderDepartment: { $regex: search, $options: 'i' } },
                    { reason: { $regex: search, $options: 'i' } }
                ]}
            ];
        }

        // 3. Execute Paginated Queries
        const totalMain = await Request.countDocuments({ ...baseFilter, status: 'pending' });
        const mainRequests = await Request.find({ ...baseFilter, status: 'pending' })
            .populate(pop).sort({ createdAt: -1 }).skip(mainStart).limit(mainLength);

        const totalLogs = await Request.countDocuments({ ...baseFilter, status: { $ne: 'pending' } });
        const logs = await Request.find({ ...baseFilter, status: { $ne: 'pending' } })
            .populate(pop).sort({ updatedAt: -1 }).skip(logStart).limit(logLength);

        res.json({
            mainRequests,
            totalMain,
            logs,
            totalLogs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 3. ACTION HANDLER
exports.handleRequestAction = async (req, res) => {
    try {
        const { action, id } = req.params;
        const request = await Request.findById(id);
        if (action === 'approve') {
            if (request.requestType === 'delete') await File.deleteMany({ _id: { $in: request.fileIds } });
            else await File.updateMany({ _id: { $in: request.fileIds } }, { $set: { uploadedBy: request.recipientId } });
            request.status = 'completed';
        } else {
            request.status = 'denied';
        }
        await request.save();
        res.json({ message: "Success" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};