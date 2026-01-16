const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

// Line 6 starts here
router.post("/create", requestController.createRequest); 
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.put("/approve/:id", requestController.approveRequest);
router.put("/deny/:id", requestController.denyRequest);

// Trash Management
router.get("/trash", requestController.getTrashItems);
router.post("/trash/restore/:id", requestController.restoreFromTrash);
router.delete("/trash/permanent/:id", requestController.permanentDelete);

module.exports = router;