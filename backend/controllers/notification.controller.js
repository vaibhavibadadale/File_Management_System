import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// Helper to determine if the user should see all departments
const checkIsAdmin = (role) => ["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase());

export const getNotifications = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const roleUpper = role?.toUpperCase();
        
        // 1. Base Query: Things sent directly to this User ID
        let query = { 
            $or: [
                { recipientId: userId && userId !== "undefined" ? userId : null }
            ] 
        };

        // 2. Add Role-based logic
        if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') {
            // ADMINS: See everything sent to 'ADMIN' or 'SUPERADMIN' regardless of dept
            query.$or.push({ targetRoles: { $in: ['ADMIN', 'SUPERADMIN'] } });
        } else if (roleUpper === 'HOD') {
            // HODs: See things sent to 'HOD' AND matching their department
            query.$or.push({ 
                targetRoles: 'HOD', 
                department: department 
            });
        }

        const notifications = await Notification.find(query).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const { userId, role, department } = req.query;
        const isAdmin = checkIsAdmin(role);

        const count = await Notification.countDocuments({
            isRead: false,
            $or: [
                { recipientId: userId && userId !== "undefined" ? userId : null },
                { 
                    targetRoles: { $in: [role] },
                    $or: [
                        { department: department },
                        { department: { $exists: false } },
                        { department: null },
                        ...(isAdmin ? [{}] : []) // Fix: Admins count all depts
                    ]
                }
            ]
        });
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const { userId, role, department } = req.body;
        const isAdmin = checkIsAdmin(role);

        await Notification.updateMany(
            {
                isRead: false,
                $or: [
                    { recipientId: userId && userId !== "undefined" ? userId : null },
                    { 
                        targetRoles: { $in: [role] },
                        $or: [
                            { department: department },
                            { department: { $exists: false } },
                            { department: null },
                            ...(isAdmin ? [{}] : []) // Fix: Admins clear all depts
                        ]
                    }
                ]
            },
            { isRead: true }
        );
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const markAsRead = async (req, res) => {
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