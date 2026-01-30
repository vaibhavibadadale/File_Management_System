const Notification = require("../models/Notification");
const mongoose = require("mongoose");

const checkIsAdmin = (role) => ["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase());

exports.getNotifications = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        const isAdmin = checkIsAdmin(roleUpper);
        
        // 1. We primarily look for notifications assigned to this specific USER ID
        // This covers the Admins, SuperAdmins, and HODs we targeted in the other controllers.
        let conditions = [
            { recipientId: userId && userId !== "undefined" ? userId : null }
        ];

        // 2. Fallback: Role-based broadcast (for any general alerts not tied to an ID)
        if (isAdmin) {
            conditions.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] }, recipientId: null });
        } else if (roleUpper === 'HOD') {
            conditions.push({ 
                targetRoles: 'HOD', 
                department: department,
                recipientId: null
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