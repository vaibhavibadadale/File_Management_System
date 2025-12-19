const express = require("express");
const router = express.Router();
const Folder = require("../models/Folder");

// GET Folders based on parent
router.get("/", async (req, res) => {
    try {
        const { parentId } = req.query;
        const filter = (!parentId || parentId === "null") ? { parent: null } : { parent: parentId };
        const folders = await Folder.find(filter);
        res.json({ folders });
    } catch (err) { res.status(500).json(err); }
});

// POST Create Folder
router.post("/create", async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const newFolder = new Folder({
            name,
            parent: (!parentId || parentId === "null") ? null : parentId
        });
        await newFolder.save();
        res.status(201).json(newFolder);
    } catch (err) { res.status(500).json(err); }
});

module.exports = router;