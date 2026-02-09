const Notification = require("../models/Notification");
const mongoose = require("mongoose");

const checkIsAdmin = (role) => ["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase());

// GET NOTIFICATIONS
exports.getNotifications = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);
        
        // 1. Primary Condition: Explicitly for this User
        let conditions = [
            { recipientId: userId && userId !== "undefined" ? userId : null }
        ];

        // 2. Role-based broadcast logic
        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ 
                targetRoles: 'HOD', 
                departmentId: department 
            });
        }

        const notifications = await Notification.find({ $or: conditions }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET UNREAD COUNT
exports.getUnreadCount = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);

        let conditions = [{ recipientId: userId !== "undefined" ? userId : null }];

        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ targetRoles: 'HOD', departmentId: department });
        }

        const count = await Notification.countDocuments({
            isRead: false,
            $or: conditions
        });
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// MARK ALL AS READ
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId, role, department } = req.body;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);

        let conditions = [{ recipientId: userId !== "undefined" ? userId : null }];

        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ targetRoles: 'HOD', departmentId: department });
        }

        await Notification.updateMany(
            { isRead: false, $or: conditions },
            { isRead: true }
        );
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// MARK SINGLE AS READ
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }
        await Notification.findByIdAndUpdate(id, { isRead: true });
        res.status(200).json({ message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE ALL NOTIFICATIONS
exports.deleteAllNotifications = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);

        let conditions = [{ recipientId: userId && userId !== "undefined" ? userId : null }];

        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ targetRoles: 'HOD', departmentId: department });
        }

        const result = await Notification.deleteMany({ $or: conditions });
        res.status(200).json({ 
            message: "All notifications permanently deleted", 
            count: result.deletedCount 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};