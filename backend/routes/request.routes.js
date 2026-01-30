const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

// Request Creation & Dashboard
router.post("/create", requestController.createRequest);
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.get("/stats", requestController.getDashboardStats);
router.get("/received", requestController.getReceivedFiles);

// --- EMAIL LOGS ---
// Added this to allow the frontend to fetch logs from the EmailLog collection
router.get("/email-logs", requestController.getEmailLogs);

// Approval & Denial
router.put("/approve/:id", requestController.approveRequest); 
router.put("/deny/:id", requestController.denyRequest);

// Trash Management
router.get("/trash", requestController.getTrashItems);

// Bulk Trash Actions (Defined before individual ID routes to prevent matching "restore-all" as an ":id")
router.post("/trash/restore-all", requestController.restoreAllTrash);
router.delete("/trash/empty", requestController.emptyTrash);

// Individual Trash Actions
router.post("/restore/:id", requestController.restoreFromTrash);
router.delete("/permanent/:id", requestController.permanentDelete);


// Add this temporarily to request.routes.js to test Gmail directly
router.get("/test-email", async (req, res) => {
    try {
        const { sendEmail } = require("../utils/emailHelper");
        await sendEmail("your-email@gmail.com", "Test Subject", "<h1>System Test</h1>", "TEST_ACTION");
        res.send("Check your terminal and MongoDB for logs!");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;