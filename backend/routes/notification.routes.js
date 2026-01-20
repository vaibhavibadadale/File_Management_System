import express from "express";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", getNotifications);
router.put("/mark-read/:id", markAsRead);
router.post("/mark-all-read", markAllAsRead);

export default router;