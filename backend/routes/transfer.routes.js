// routes/requestRoutes.js
const express = require("express");
const router = express.Router();
const transferController = require("../controllers/transfer.controller");

// Create new transfer request
router.post("/create", transferController.createRequest);

// Get dashboard (pending + history)
router.get("/pending", transferController.getPendingDashboard);

// Approve transfer
router.put("/approve/:transferId", transferController.approveTransfer);

// Deny transfer
router.put("/deny/:transferId", transferController.denyTransfer);
// Make sure this exact line exists
router.get("/received", transferController.getReceivedFiles);

// (Optional) Received files endpoint if needed
// router.get("/received", transferController.getReceivedFiles);

module.exports = router;