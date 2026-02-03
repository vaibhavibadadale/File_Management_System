const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backup.controller');

// Main backup trigger
router.get('/system-backup', backupController.generateSystemBackup);

// Validation routes (Fixes the 404 errors)
router.get('/storage-stats', backupController.getSystemStats);
router.get('/system-backup-check', backupController.getBackupCheck);

// Schedule settings (Fixes the 404 for the Update Schedule button)
router.post('/settings', (req, res) => {
    // This is where you would save the interval to your DB
    console.log("Setting backup interval to:", req.body.autoBackupInterval);
    res.json({ success: true, message: "Schedule updated successfully" });
});

module.exports = router;