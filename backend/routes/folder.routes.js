const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folder.controller");
const Folder = require("../models/Folder"); // Added Import

// Updated GET to handle Starred filtering
router.get("/", async (req, res, next) => {
    if (req.query.isStarred === "true") {
        try {
            const query = { isStarred: true };
            if (req.query.userId) query.createdBy = req.query.userId;
            
            const folders = await Folder.find(query);
            return res.json(folders);
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    }
    // Default to existing controller logic
    folderController.getFolders(req, res);
});

router.post("/create", folderController.createFolder);

router.delete("/:id", folderController.softDeleteFolder);

// Toggle Star for Folders
router.patch("/star/:id", async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) return res.status(404).json({ message: "Folder not found" });
        
        folder.isStarred = req.body.isStarred;
        await folder.save();
        res.json({ message: "Star status updated", isStarred: folder.isStarred });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.patch('/star/:id', folderController.toggleFolderStar);

module.exports = router;