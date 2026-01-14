const express = require("express");
const router = express.Router();
const requestCtrl = require("../controllers/request.controller");

// Creation
router.post("/create", requestCtrl.createRequest);

// Dashboard (Matches axios.get(.../pending-dashboard))
router.get("/pending-dashboard", requestCtrl.getPendingDashboard);

// Actions
router.put("/approve/:id", requestCtrl.approveRequest);
router.put("/deny/:id", requestCtrl.denyRequest);

// Trash Management
router.get("/trash", requestCtrl.getTrashItems);
router.post("/trash/restore/:id", requestCtrl.restoreFromTrash);
router.delete("/trash/permanent/:id", requestCtrl.permanentDelete);

module.exports = router;