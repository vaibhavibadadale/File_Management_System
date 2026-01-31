const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
// 1. DASHBOARD & DATA
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.get("/stats", requestController.getDashboardStats);
router.get("/received", requestController.getReceivedFiles);

// 2. REQUEST LIFECYCLE
router.post("/create", requestController.createRequest);
router.put("/approve/:id", requestController.approveRequest); 
router.put("/deny/:id", requestController.denyRequest);

// 3. EMAIL-LINK ACTIONS
router.post("/approve-email/:id", requestController.approveFromEmail);
router.post("/deny-email/:id", requestController.denyFromEmail);
router.post("/secure-action/:requestId", requestController.secureAction);
// 4. TRASH MANAGEMENT
router.get("/trash", requestController.getTrashItems);
router.post("/trash/restore-all", requestController.restoreAllTrash); // Above /:id
router.delete("/trash/empty", requestController.emptyTrash);         // Above /:id
router.post("/restore/:id", requestController.restoreFromTrash);
router.delete("/permanent/:id", requestController.permanentDelete);

module.exports = router;