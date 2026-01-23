const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const File = require("../models/File");
const fileController = require("../controllers/file.controller");
const transferController = require('../controllers/transfer.controller');

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
                query.$or = [
                    { uploadedBy: userId },
                    { sharedWith: userId }
                ];
            }
            
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
    // Fallback logic
    return (async () => {
        try {
            const file = await File.findById(req.params.id);
            if (!file) return res.status(404).json({ message: "File not found" });
            
            file.isStarred = req.body.isStarred;
            await file.save();
            res.json({ success: true, message: "Star status updated", isStarred: file.isStarred });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })();
});

/**
 * 4. POST: Track File View
 */
router.post("/track-view", (req, res, next) => {
    if (fileController.trackView) {
        return fileController.trackView(req, res, next);
    }
    res.status(500).json({ message: "View tracking handler not found in controller" });
});

/**
 * 5. DELETE: Soft Delete
 */
router.delete("/:id", (req, res, next) => {
    if (fileController.softDeleteFile) {
        return fileController.softDeleteFile(req, res, next);
    }
    res.status(500).json({ message: "Delete handler not found in controller" });
});

/**
 * 6. POST: Secure Transfer
 */
router.post("/transfer", (req, res, next) => {
    const transferMethod = transferController.secureTransfer || transferController.createRequest;
    if (transferMethod) {
        return transferMethod(req, res, next);
    }
    res.status(500).json({ message: "Transfer handler not found in controller" });
});

module.exports = router;