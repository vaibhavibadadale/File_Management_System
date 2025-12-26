const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folder.controller");

// If any of these are missing in folder.controller.js, it will crash
// router.get("/", folderController.getFolders);
// backend/routes/folder.routes.js
router.get("/", folderController.getFolders);
router.post("/create", folderController.createFolder);
router.delete("/:id", folderController.softDeleteFolder);

module.exports = router;