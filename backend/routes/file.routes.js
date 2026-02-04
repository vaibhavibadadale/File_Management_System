const express = require("express");
const File = require("../models/File");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const fileController = require("../controllers/file.controller");
const transferController = require('../controllers/transfer.controller');
const backupController = require('../controllers/backup.controller');

/**
 * 1. POST: File Upload
 */
router.post("/upload", upload.single("file"), (req, res, next) => {
    if (fileController.uploadFile) {
        return fileController.uploadFile(req, res, next);
    }
    res.status(500).json({ message: "Upload handler not found in controller" });
});

/**
 * 2. GET: Fetch Files (With Starred Support)
 */
router.get("/", fileController.getFilesByFolder);

/**
 * 3. PATCH: Toggle Star Status
 */
// Example Express Backend Controller
router.patch('/star/:id', fileController.toggleFileStar);
/**
 * 4. NEW: PUT Toggle File Disable Status
 */
router.put("/toggle-status/:id", (req, res, next) => {
    if (fileController.toggleFileStatus) {
        return fileController.toggleFileStatus(req, res, next);
    }
    res.status(500).json({ message: "Toggle status handler not found in controller" });
});

/**
 * 5. POST: Track File View
 */
router.post("/track-view", (req, res, next) => {
    if (fileController.trackView) {
        return fileController.trackView(req, res, next);
    }
    res.status(500).json({ message: "View tracking handler not found in controller" });
});

/**
 * 6. DELETE: Soft Delete
 */
router.delete("/:id", (req, res, next) => {
    if (fileController.softDeleteFile) {
        return fileController.softDeleteFile(req, res, next);
    }
    res.status(500).json({ message: "Delete handler not found in controller" });
});

/**
 * 7. POST: Secure Transfer
 */
router.post("/transfer", (req, res, next) => {
    const transferMethod = transferController.secureTransfer || transferController.createRequest;
    if (transferMethod) {
        return transferMethod(req, res, next);
    }
    res.status(500).json({ message: "Transfer handler not found in controller" });
});

router.get('/system-backup', backupController.generateSystemBackup);

module.exports = router;