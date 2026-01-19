const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

// Line 8: If getNotifications is undefined in the controller, it crashes here
router.get("/", notificationController.getNotifications);

// Ensure this matches the function name in your controller
router.put("/:id/read", notificationController.markAsRead);

module.exports = router;