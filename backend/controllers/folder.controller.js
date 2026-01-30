const Folder = require("../models/Folder");
const crypto = require('crypto');

// CREATE FOLDER: Maintains nesting via parentFolderId
exports.createFolder = async (req, res) => {
    console.log("📥 Received Body:", req.body); 

    try {
        const { name, parent, departmentId, createdBy } = req.body;

        // Force 'parent' to be actual null if it's missing or "null" string
        // This ensures folders created in 'Home' have parentFolderId: null
        const validatedParentId = (!parent || parent === "null" || parent === "undefined") ? null : parent;

        const folder = await Folder.create({
            folderName: name,         
            parentFolderId: validatedParentId, 
            departmentId: departmentId,
            createdBy: createdBy,
            predictedId: crypto.randomBytes(16).toString('hex'),
            sharedWith: [] // Initialize empty shared list
        });

        res.status(201).json({ folder });
    } catch (error) {
        console.error("❌ DB Save Error:", error.message);
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