const express = require("express");
const router = express.Router();
const multer = require("multer");
const File = require("../models/File");
const upload = multer({ dest: "uploads/" });

// GET: Fetch files based on folder or search
router.get("/", async (req, res) => {
    try {
        const { folderId, search } = req.query;
        let filter = {};
        if (search) {
            filter = { originalname: { $regex: search, $options: "i" } };
        } else {
            filter = (!folderId || folderId === "null") ? { folderId: null } : { folderId };
        }
        const files = await File.find(filter);
        res.json({ files });
    } catch (err) { res.status(500).json(err); }
});

// POST: Upload file
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const newFile = new File({
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            folderId: req.body.folderId === "null" ? null : req.body.folderId
        });
        await newFile.save();
        res.status(201).json(newFile);
    } catch (err) { res.status(500).json(err); }
});

// POST: Transfer Logic (Fixes the 404)
router.post("/transfer", async (req, res) => {
    try {
        const { fileIds, targetUser } = req.body;
        if (!fileIds || !targetUser) return res.status(400).json({ error: "Missing data" });

        await File.updateMany(
            { _id: { $in: fileIds } },
            { $set: { recipient: targetUser, folderId: null } } // Moves to target user's root
        );
        res.status(200).json({ message: "Transfer successful" });
    } catch (err) { res.status(500).json({ error: "Transfer failed" }); }
});

module.exports = router;