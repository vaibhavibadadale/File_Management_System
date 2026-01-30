const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

// CommonJS uses the controller object to access functions
router.get("/", notificationController.getNotifications);

// Adding the unread count route which is used in the frontend navbar
router.get("/unread-count", notificationController.getUnreadCount);

router.put("/mark-read/:id", notificationController.markAsRead);
router.post("/mark-all-read", notificationController.markAllAsRead);

router.delete("/delete-all", notificationController.deleteAllNotifications);

module.exports = router;