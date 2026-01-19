const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

// Request Management
router.post("/create", requestController.createRequest); 
router.get("/pending-dashboard", requestController.getPendingDashboard);

// FIXED: Matching the names in your controller exactly
router.put("/approve/:transferId", requestController.approveTransfer);
router.put("/deny/:transferId", requestController.denyTransfer);

// Stats & Metadata
router.get("/dashboard-stats", requestController.getDashboardStats);

// Trash Management
router.get("/trash", requestController.getTrashItems);
router.post("/trash/restore/:id", requestController.restoreFromTrash);
router.delete("/trash/permanent/:id", requestController.permanentDelete);

module.exports = router;