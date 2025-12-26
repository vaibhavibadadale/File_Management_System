const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const transferController = require('../controllers/transfer.Controller');
const {
  uploadFile,
  getFilesByFolder,
  softDeleteFile
} = require("../controllers/file.controller");

// 1. POST route for uploads (Uses dynamic folder middleware)
router.post("/upload", upload.single("file"), uploadFile);

// 2. GET route for fetching files
router.get("/", getFilesByFolder);

// 3. DELETE route
router.delete("/:id", softDeleteFile);

// 4. Secure Transfer route
router.post("/transfer", transferController.secureTransfer);

module.exports = router;