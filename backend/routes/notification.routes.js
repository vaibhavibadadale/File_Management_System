import express from "express";
// IMPORTANT: Add .js at the end of the file path
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead); 
router.put("/:id/read", markAsRead);

export default router; // Use export default, not module.exports