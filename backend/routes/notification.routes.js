const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

// Get all notifications for the logged-in user (filtered by ID and Role)
router.get("/", notificationController.getNotifications);

// Get count for the badge icon
router.get("/unread-count", notificationController.getUnreadCount);

// Mark specific notification as read
router.put("/mark-read/:id", notificationController.markAsRead);

// Mark all filtered notifications as read
router.post("/mark-all-read", notificationController.markAllAsRead);

// Permanent deletion of user-accessible notifications
router.delete("/delete-all", notificationController.deleteAllNotifications);

module.exports = router;