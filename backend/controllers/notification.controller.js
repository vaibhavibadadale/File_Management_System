import Notification from "../models/Notification.js";
import mongoose from "mongoose";

/**
 * Fetches notifications based on user ID or Role.
 */export const getNotifications = async (req, res) => {
    try {
        const { userId, role, departmentId } = req.query;
        const roleUpper = role ? role.toUpperCase() : "";

        let query = { isRead: false };

        if (roleUpper === "ADMIN" || roleUpper === "SUPERADMIN") {
            // Admins see everything sent to them or their roles
            query.$or = [
                { recipientId: new mongoose.Types.ObjectId(userId) },
                { targetRoles: { $in: ["ADMIN", "SUPERADMIN"] } }
            ];
        } else if (roleUpper === "HOD") {
            // HODs see ONLY:
            // 1. Things sent specifically to their userId
            // 2. AND Things where the department matches their own
            query.$or = [
                { recipientId: new mongoose.Types.ObjectId(userId) },
                { 
                    targetRoles: { $in: ["HOD"] }, 
                    departmentId: new mongoose.Types.ObjectId(departmentId) 
                }
            ];
        } else {
            // Regular users only see things sent to their specific ID
            query.recipientId = new mongoose.Types.ObjectId(userId);
        }

        const list = await Notification.find(query).sort({ createdAt: -1 });
        res.status(200).json(list);
    } catch (err) {
        console.error("Fetch Notification Error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Marks a single notification as read.
 */
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Notification ID" });
        }
        await Notification.findByIdAndUpdate(id, { isRead: true });
        res.status(200).json({ message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Marks all notifications for a user/role as read.
 */
export const markAllAsRead = async (req, res) => {
    try {
        const { userId, role } = req.body;

        await Notification.updateMany(
            {
                $or: [
                    { recipientId: userId && userId !== "undefined" ? new mongoose.Types.ObjectId(userId) : null },
                    { targetRoles: { $in: [role] } }
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