const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const FileController = require("../controllers/fileController");
const folderController = require("../controllers/folderController");

// File routes
router.post("/upload", upload, FileController.createFileEntry);
router.get("/download/:id", FileController.downloadFile);

router.get("/", FileController.getAllFiles);

// ⭐ ADD THIS DOWNLOAD ROUTE ⭐
router.get("/download/:id", async (req, res) => {
    try {
        const File = require("../models/File");
        const path = require("path");

        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send("File not found");

        const filePath = path.join(__dirname, "..", "uploads", file.path);

        res.download(filePath, file.originalname);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error downloading file");
    }
});

module.exports = router;
