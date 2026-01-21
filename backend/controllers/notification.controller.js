const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// Helper to determine if the user should see all departments
const checkIsAdmin = (role) => ["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase());

exports.getNotifications = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);
        
        // 1. Base conditions (Directly to User)
        let conditions = [
            { recipientId: userId && userId !== "undefined" ? userId : null }
        ];

        // 2. Role-based logic
        if (isAdmin) {
            // Admins see everything meant for Admin/Superadmin
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            // HODs see things for HOD role matching their department
            conditions.push({ 
                targetRoles: 'HOD', 
                department: department 
            });
        }

        const notifications = await Notification.find({ $or: conditions }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);

        let conditions = [{ recipientId: userId !== "undefined" ? userId : null }];

        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ targetRoles: 'HOD', department: department });
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

exports.markAllAsRead = async (req, res) => {
    try {
        const { userId, role, department } = req.body;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);

        let conditions = [{ recipientId: userId !== "undefined" ? userId : null }];

        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ targetRoles: 'HOD', department: department });
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
// DELETE ALL NOTIFICATIONS (Persistent)
exports.deleteAllNotifications = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);

        // Define which notifications this user is allowed to clear
        let conditions = [{ recipientId: userId && userId !== "undefined" ? userId : null }];

        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            conditions.push({ targetRoles: 'HOD', department: department });
        }

        // Permanently delete from the database
        const result = await Notification.deleteMany({ $or: conditions });

        res.status(200).json({ 
            message: "All notifications permanently deleted", 
            count: result.deletedCount 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};