const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const File = require("../models/File");

// Import the controllers
const fileController = require("../controllers/file.controller");
const transferController = require('../controllers/transfer.controller');

/**
 * 1. POST: File Upload
 * Uses the upload middleware and calls the uploadFile controller.
 */
router.post("/upload", upload.single("file"), (req, res, next) => {
    if (fileController.uploadFile) {
        return fileController.uploadFile(req, res, next);
    }
    res.status(500).json({ message: "Upload handler not found in controller" });
});

/**
 * 2. GET: Fetch Files (Merged Logic)
 * Supports ?isStarred=true for the Starred page and standard folder navigation.
 */
router.get("/", async (req, res, next) => {
    const { isStarred, userId } = req.query;

    // Handle Starred items explicitly if requested
    if (isStarred === "true") {
        try {
            // Note: deletedAt: null is handled by the model middleware, but we include it for clarity
            let query = { isStarred: true, deletedAt: null };
            
            if (userId) {
                query.$or = [
                    { uploadedBy: userId },
                    { sharedWith: userId }
                ];
            }
            
            const files = await File.find(query).populate("uploadedBy", "name username");
            return res.json({ files, success: true });
        } catch (err) {
            return res.status(500).json({ message: err.message, success: false });
        }
    }

    // Default to controller logic for folder-based fetching
    if (fileController.getFilesByFolder) {
        return fileController.getFilesByFolder(req, res, next);
    }
    res.status(500).json({ message: "Fetch handler not found in controller" });
});

/**
 * 3. PATCH: Toggle Star Status
 * Uses the controller logic for consistency with logs and response structure.
 */
router.patch("/star/:id", (req, res, next) => {
    if (fileController.toggleFileStar) {
        return fileController.toggleFileStar(req, res, next);
    }
    // Fallback to inline logic if controller is missing
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
 * Records the timestamp and user ID when a file is opened.
 */
router.post("/track-view", (req, res, next) => {
    if (fileController.trackView) {
        return fileController.trackView(req, res, next);
    }
    res.status(500).json({ message: "View tracking handler not found" });
});

/**
 * 5. DELETE: Soft Delete
 * Marks the file as deleted rather than removing it from disk.
 */
router.delete("/:id", (req, res, next) => {
    if (fileController.softDeleteFile) {
        return fileController.softDeleteFile(req, res, next);
    }
    res.status(500).json({ message: "Delete handler not found in controller" });
});

/**
 * 6. POST: Secure Transfer / Create Request
 * Bridges the transfer logic into the file routes for unified file operations.
 */
router.post("/transfer", (req, res, next) => {
    // Check both potential naming conventions for the transfer method
    const transferMethod = transferController.secureTransfer || transferController.createRequest;
    if (transferMethod) {
        return transferMethod(req, res, next);
    }
    res.status(500).json({ message: "Transfer handler not found in controller" });
});

module.exports = router;