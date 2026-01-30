const express = require("express");
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
router.get("/", async (req, res, next) => {
    const { isStarred, userId } = req.query;
    if (isStarred === "true") {
        try {
            let query = { isStarred: true, deletedAt: null };
            if (userId) {
                query.$or = [{ uploadedBy: userId }, { sharedWith: userId }];
            }
            const File = require("../models/File"); // Ensure File model is loaded
            const files = await File.find(query)
                .populate("uploadedBy", "name username")
                .sort({ updatedAt: -1 });
            return res.json({ files, success: true });
        } catch (err) {
            return res.status(500).json({ message: err.message, success: false });
        }
    }

    if (fileController.getFilesByFolder) {
        return fileController.getFilesByFolder(req, res, next);
    }
    res.status(500).json({ message: "Fetch handler not found in controller" });
});

/**
 * 3. PATCH: Toggle Star Status
 */
router.patch("/star/:id", (req, res, next) => {
    if (fileController.toggleFileStar) {
        return fileController.toggleFileStar(req, res, next);
    }
    return res.status(500).json({ message: "Star handler not found" });
});

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