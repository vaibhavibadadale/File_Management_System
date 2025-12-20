const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const transferController = require('../controllers/transfer.Controller');
const {
  uploadFile,
  getFilesByFolder,
  softDeleteFile
} = require("../controllers/file.controller");

// 1. POST route for uploads (matches axios.post('/api/files/upload'))
router.post("/upload", upload.single("file"), uploadFile);

// 2. GET route for fetching files (matches axios.get('/api/files?folderId=...'))
// This replaces your "SAFE fallback" and your "getFilesByFolder"
router.get("/", getFilesByFolder);

// 3. DELETE route
router.delete("/:id", softDeleteFile);

// Example Backend Code (Node.js/Express)
// Add this to your backend routes file
// router.post("/transfer", async (req, res) => {
//     const { fileIds, sender, recipient } = req.body;
    
//     console.log(`Transferring ${fileIds} from ${sender} to ${recipient}`);

//     try {
//         // Logic to update the 'owner' or 'department' of the files in MongoDB
//         // Example: await File.updateMany({ _id: { $in: fileIds } }, { owner: recipient });
        
//         res.status(200).json({ message: "Files transferred successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Error during transfer" });
//     }
// });

// In your route file, simply point to the controller:
router.post("/transfer", transferController.secureTransfer);

// REMOVE any console.log(...) that sits directly in the route file 
// before the controller is called. 
module.exports = router;