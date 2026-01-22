const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

// Request Creation & Dashboard
router.post("/create", requestController.createRequest);
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.get("/stats", requestController.getDashboardStats);
router.get("/received", requestController.getReceivedFiles);

// Approval & Denial
router.put("/approve/:id", requestController.approveRequest); 
router.put("/deny/:id", requestController.denyRequest);

// Trash Management
router.get("/trash", requestController.getTrashItems);

// NEW: Bulk Trash Actions (Defined before individual ID routes)
router.post("/trash/restore-all", requestController.restoreAllTrash);
router.delete("/trash/empty", requestController.emptyTrash);

// Individual Trash Actions
router.post("/restore/:id", requestController.restoreFromTrash);
router.delete("/permanent/:id", requestController.permanentDelete);

module.exports = router;