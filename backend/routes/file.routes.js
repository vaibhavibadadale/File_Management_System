const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");

// Import the controllers
const fileController = require("../controllers/file.controller");
const transferController = require('../controllers/transfer.controller');

// ================= ROUTES =================

// 1. POST: File Upload
// Matches: POST /api/files/upload
router.post("/upload", upload.single("file"), (req, res, next) => {
    if (fileController.uploadFile) {
        return fileController.uploadFile(req, res, next);
    }
    res.status(500).json({ message: "Upload handler not found in controller" });
});

// 2. GET: Fetch Files (e.g., by folder)
// Matches: GET /api/files
router.get("/", (req, res, next) => {
    if (fileController.getFilesByFolder) {
        return fileController.getFilesByFolder(req, res, next);
    }
    res.status(500).json({ message: "Fetch handler not found in controller" });
});

// 3. DELETE: Soft Delete / Mark for deletion
// Matches: DELETE /api/files/:id
router.delete("/:id", (req, res, next) => {
    if (fileController.softDeleteFile) {
        return fileController.softDeleteFile(req, res, next);
    }
    res.status(500).json({ message: "Delete handler not found in controller" });
});

// 4. POST: Secure Transfer Request
// Matches: POST /api/files/transfer
router.post("/transfer", (req, res, next) => {
    if (transferController && transferController.secureTransfer) {
        return transferController.secureTransfer(req, res, next);
    }
    res.status(500).json({ message: "Transfer handler not found in controller" });
});

module.exports = router;