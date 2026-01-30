const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backup.controller');

// Place this route
router.get('/system-backup', backupController.generateSystemBackup);

module.exports = router;