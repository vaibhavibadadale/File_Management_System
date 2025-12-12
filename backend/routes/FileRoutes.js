const express = require("express");
const router = express.Router();
const FileController = require("../controllers/fileController");

// Fetch all files
router.get("/", FileController.getAllFiles);

// Delete file by ID
router.delete("/:id", FileController.deleteFile);

module.exports = router;
