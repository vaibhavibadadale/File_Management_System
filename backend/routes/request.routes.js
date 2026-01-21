const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

// --- Main Request Actions ---
router.post("/create", requestController.createRequest);
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.get("/stats", requestController.getDashboardStats);

// --- File Retrieval ---
// This handles GET /api/requests/received
router.get("/received", requestController.getReceivedFiles);

// --- HOD/Admin Actions ---
router.put("/approve/:id", requestController.approveRequest); 
router.put("/deny/:id", requestController.denyRequest);

// --- Trash Management ---
router.get("/trash", requestController.getTrashItems);
router.post("/restore/:id", requestController.restoreFromTrash);
router.delete("/permanent/:id", requestController.permanentDelete);

module.exports = router;