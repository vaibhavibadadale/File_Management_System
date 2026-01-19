const Notification = require("../models/Notification");

/**
 * Fetches notifications based on user ID or Role.
 * Supports both direct and role-based broadcasts.
 */
exports.getNotifications = async (req, res) => {
    try {
        const { userId, role } = req.query;

        // Validates that at least one identifier is provided
        if (!userId && !role) {
            return res.status(400).json({ error: "User ID or Role is required" });
        }

        // Search by recipientId OR by the user's role in the targetRoles array
        const list = await Notification.find({
            $or: [
                { recipientId: userId },
                { targetRoles: role }
            ]
        }).sort({ createdAt: -1 });
        
        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Marks a single notification as read by its MongoDB ID.
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndUpdate(id, { isRead: true });
        res.status(200).json({ message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Marks all notifications for a specific user/role as read.
 * This supports the "Mark all as read" button on your NotificationsPage.
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!userId && !role) {
            return res.status(400).json({ error: "User ID or Role is required" });
        }

        // Updates all matching unread notifications to read: true
        await Notification.updateMany(
            {
                $or: [
                    { recipientId: userId },
                    { targetRoles: role }
                ],
                isRead: false
            },
            { isRead: true }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};