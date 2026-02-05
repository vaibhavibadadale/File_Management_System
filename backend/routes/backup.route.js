const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backup.controller');

// Main backup trigger
router.get('/system-backup', backupController.generateSystemBackup);

// Validation routes
router.get('/storage-stats', backupController.getSystemStats);
router.get('/system-backup-check', backupController.getBackupCheck);

// NEW: Admin History & Download
router.get('/list', backupController.listBackups);
router.get('/download/:filename', backupController.downloadBackupFile);

// Schedule settings
router.post('/settings', (req, res) => {
    console.log("Setting backup interval to:", req.body.autoBackupInterval);
    res.json({ success: true, message: "Schedule updated successfully" });
});

module.exports = router;