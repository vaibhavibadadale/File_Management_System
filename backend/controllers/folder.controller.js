const Folder = require("../models/Folder");
const crypto = require('crypto');

// 1. Ensure "exports.name" is used for every function
// backend/controllers/folder.controller.js

// backend/controllers/folder.controller.js
exports.createFolder = async (req, res) => {
    // This log helps you see exactly what the frontend is sending
    console.log("📥 Received Body:", req.body); 

    try {
        const { name, parent, departmentId, createdBy } = req.body;

        // Force 'parent' to be actual null if it's missing or "null" string
        const validatedParentId = (!parent || parent === "null") ? null : parent;

        const folder = await Folder.create({
            folderName: name,         // Map 'name' to 'folderName'
            parentFolderId: validatedParentId, 
            departmentId: departmentId,
            createdBy: createdBy,
            predictedId: require('crypto').randomBytes(16).toString('hex')
        });

        res.status(201).json({ folder });
    } catch (error) {
        console.error("❌ DB Save Error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

exports.getFolders = async (req, res) => {
    try {
        const { parentId, departmentId } = req.query;
        
        // If parentId is null, look for folders where parentFolderId is null
        const searchParent = (!parentId || parentId === "null") ? null : parentId;

        const folders = await Folder.find({
            departmentId: departmentId,
            parentFolderId: searchParent
        });

        res.json({ folders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.softDeleteFolder = async (req, res) => {
    try {
        await Folder.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
        res.json({ message: "Folder deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};