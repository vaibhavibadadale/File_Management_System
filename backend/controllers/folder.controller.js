const Folder = require("../models/Folder");
const crypto = require('crypto');

exports.createFolder = async (req, res) => {
    console.log("📥 Received Body:", req.body); 

    try {
        const { name, parent, departmentId, createdBy, username } = req.body;

        // 1. FIX: Explicitly check for folder name. 
        // If frontend sends 'name', we assign it to 'folderName' for the DB.
        const finalFolderName = name; 
        if (!finalFolderName) {
            return res.status(400).json({ error: "folderName is required." });
        }

        // 2. Nesting Logic
        const validatedParentId = (!parent || parent === "null" || parent === "undefined") ? null : parent;

        // 3. Admin Flag Logic (Optional but good for tracking)
        const isSpecialUser = username?.startsWith("s-") || username?.startsWith("a-");

        const folder = await Folder.create({
            folderName: finalFolderName, // Matches Schema
            parentFolderId: validatedParentId, 
            departmentId: departmentId, // Required ObjectId
            createdBy: createdBy, // Required ObjectId
            uploadedBy: createdBy, // Added for consistency with transfer logic
            predictedId: crypto.randomBytes(16).toString('hex'), // Matches Schema
            transferStatus: 'none', // Required for your filter logic
            sharedWith: [] 
        });

        res.status(201).json({ folder });
    } catch (error) {
        console.error("❌ DB Save Error:", error.message);
        // This will now tell you exactly if departmentId or folderName is missing
        res.status(400).json({ error: error.message });
    }
};

// GET FOLDERS: Updated to show Created OR Shared folders
exports.getFolders = async (req, res) => {
    try {
        const { parentId, departmentId, userId } = req.query;
        
        // If parentId is null/undefined, we search for root folders (parentFolderId: null)
        const searchParent = (!parentId || parentId === "null" || parentId === "undefined") ? null : parentId;

        let query = {
            parentFolderId: searchParent,
            deletedAt: null 
        };

        // If departmentId is provided, keep it in the query
        if (departmentId) query.departmentId = departmentId;

        // UPDATED LOGIC: If userId is provided, show folders they created OR folders shared with them
        if (userId) {
            query.$or = [
                { createdBy: userId },
                { sharedWith: userId }
            ];
        }

        const folders = await Folder.find(query);

        res.json({ folders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// SOFT DELETE
exports.softDeleteFolder = async (req, res) => {
    try {
        await Folder.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
        res.json({ message: "Folder deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.toggleFolderStar = async (req, res) => {
    try {
        const { id } = req.params;
        const { isStarred } = req.body;

        const updatedFolder = await Folder.findByIdAndUpdate(
            id,
            { isStarred },
            { new: true }
        );

        if (!updatedFolder) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        res.json({ success: true, folder: updatedFolder });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};