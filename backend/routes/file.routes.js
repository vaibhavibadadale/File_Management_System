const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const File = require("../models/File"); // Added Import

// Import the controllers
const fileController = require("../controllers/file.controller");
const transferController = require('../controllers/transfer.controller');

// 1. POST: File Upload
router.post("/upload", upload.single("file"), (req, res, next) => {
    if (fileController.uploadFile) {
        return fileController.uploadFile(req, res, next);
    }
    res.status(500).json({ message: "Upload handler not found in controller" });
});

// 2. GET: Fetch Files (Merged Logic)
router.get("/", async (req, res, next) => {
    const { isStarred, folderId, userId } = req.query;

    // If we are specifically looking for starred items, we handle it here
    if (isStarred === "true") {
        try {
            const query = { isStarred: true };
            if (userId) query.uploadedBy = userId; // Filter by user if ID provided
            
            const files = await File.find(query);
            return res.json({ files });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    }

    // Otherwise, use the existing controller logic for folder navigation
    if (fileController.getFilesByFolder) {
        return fileController.getFilesByFolder(req, res, next);
    }
    res.status(500).json({ message: "Fetch handler not found in controller" });
});

// 3. PATCH: Toggle Star Status
router.patch("/star/:id", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: "File not found" });
        
        file.isStarred = req.body.isStarred;
        await file.save();
        res.json({ message: "Star status updated", isStarred: file.isStarred });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. DELETE: Soft Delete
router.delete("/:id", (req, res, next) => {
    if (fileController.softDeleteFile) {
        return fileController.softDeleteFile(req, res, next);
    }
    res.status(500).json({ message: "Delete handler not found in controller" });
});

// 5. POST: Secure Transfer
router.post("/transfer", (req, res, next) => {
    if (transferController && transferController.secureTransfer) {
        return transferController.secureTransfer(req, res, next);
    }
    res.status(500).json({ message: "Transfer handler not found in controller" });
});


router.patch('/star/:id', fileController.toggleFileStar);

module.exports = router;