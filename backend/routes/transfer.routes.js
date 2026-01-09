const express = require("express");
const router = express.Router();
const transferController = require("../controllers/transfer.controller");

// 1. Create
router.post("/create", transferController.createRequest);

// 2. Fetch Dashboard
router.get("/pending", transferController.getPendingDashboard);

// 3. Approve (Matches exports.approveTransfer)
router.put("/approve/:transferId", transferController.approveTransfer);

// 4. Deny (Matches exports.denyTransfer)
router.put("/deny/:transferId", transferController.denyTransfer);

// 5. Received
router.get("/received", transferController.getReceivedFiles);

module.exports = router;