const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

// 1. Creation
router.post("/create", requestController.createRequest); 

// 2. Dashboard & Stats
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.get("/stats", requestController.getDashboardStats);

// 3. Approval Actions
router.put("/approve/:id", requestController.approveRequest);
router.put("/deny/:id", requestController.denyRequest);

// 4. Trash Management
router.get("/trash", requestController.getTrashItems);
router.post("/trash/restore/:id", requestController.restoreFromTrash);
router.delete("/trash/permanent/:id", requestController.permanentDelete);

module.exports = router;