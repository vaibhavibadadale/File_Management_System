// backend/routes/FolderRoutes.js
const express = require("express");
const router = express.Router();
const FolderController = require("../controllers/folderController");

// Folder routes
router.post("/create", FolderController.createFolder);
router.get("/", FolderController.getAllFolders); // Fetch all folders

module.exports = router;
