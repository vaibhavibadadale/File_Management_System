const File = require("../models/File");
const Folder = require("../models/Folder");
const Log = require("../models/Log");
const path = require("path");

exports.uploadFile = async (req, res) => {
    try {
        const { folderId, uploadedBy, departmentId, username } = req.body;
        const targetUserFolder = username || "Admin";
        const targetFolderId = (!folderId || folderId === "null") ? null : folderId;

        let nestedPath = "";
        if (targetFolderId) {
            const folderDoc = await Folder.findById(targetFolderId);
            if (folderDoc && folderDoc.path) {
                nestedPath = folderDoc.path.endsWith('/') ? folderDoc.path : `${folderDoc.path}/`;
            }
        }

        const finalDbPath = `/uploads/${targetUserFolder}/${nestedPath}${req.file.filename}`;

        const newFile = await File.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            folder: targetFolderId,
            uploadedBy: uploadedBy,
            username: targetUserFolder,
            departmentId: departmentId,
            size: req.file.size,
            mimeType: req.file.mimetype,
            path: finalDbPath 
        });

        await Log.create({
            userId: uploadedBy,
            action: "FILE_UPLOADED",
            fileId: newFile._id,
            details: `Uploaded ${req.file.originalname} to ${targetUserFolder}'s folder`
        });

        res.status(201).json({ message: "File Saved", file: newFile, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};

exports.getFilesByFolder = async (req, res) => {
    try {
        const { folderId, userId, all, isStarred } = req.query; 
        
        // 1. Validation: Ensure we have a valid userId
        if (!userId || userId === "null" || userId === "undefined") {
            return res.status(400).json({ success: false, message: "User context missing." });
        }

        // 2. Base query: skip deleted files
        let query = { deletedAt: null };

        if (isStarred === "true") {
            // FIX: Search for files where THIS user's ID is inside the star array
            // This achieves your "simple requirement" of individual importance
            query.isStarred = { $in: [userId] }; 
        } else {
            // REGULAR BROWSING: Show my files OR files shared with me
            query.$or = [
                { uploadedBy: userId },
                { sharedWith: userId }
            ];

            // Folder nesting logic
            if (all !== "true") {
                query.folder = (!folderId || folderId === "null") ? null : folderId;
            }
        }

        const files = await File.find(query)
            .populate("uploadedBy", "name username")
            .sort({ createdAt: -1 });

        return res.json({ files, success: true });

    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ error: error.message, success: false });
    }
};

exports.trackView = async (req, res) => {
    try {
        const { fileId, userId } = req.body;
        
        if (!fileId) return res.status(400).json({ success: false, message: "File ID required" });

        const updateData = { 
            $set: { lastViewedAt: new Date() }
        };

        if (userId) {
            updateData.$addToSet = { viewedBy: userId };
        }

        const updatedFile = await File.findByIdAndUpdate(
            fileId, 
            updateData,
            { new: true }
        );

        if (!updatedFile) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        res.status(200).json({ success: true, lastViewedAt: updatedFile.lastViewedAt });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.toggleFileStar = async (req, res) => {
    try {
        const { id } = req.params; // File ID
        const { userId, isStarred } = req.body; 

        // 1. Double check the incoming userId is valid to prevent CastErrors
        if (!userId || userId.length !== 24) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        // 2. The Logic Switch
        // If isStarred is true, we ADD the userId to the list
        // If isStarred is false, we REMOVE the userId from the list
        const update = isStarred 
            ? { $addToSet: { isStarred: userId } } 
            : { $pull: { isStarred: userId } };

        // 3. Execution
        const updatedFile = await File.findByIdAndUpdate(
            id, 
            update, 
            { new: true }
        );

        if (!updatedFile) {
            return res.status(404).json({ message: "File not found" });
        }

        res.json({ 
            success: true, 
            count: updatedFile.isStarred.length // Useful for debugging
        });

    } catch (error) {
        console.error("❌ Backend Star Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.softDeleteFile = async (req, res) => {
    try {
        const { userId } = req.body;
        const file = await File.findByIdAndUpdate(req.params.id, {
            deletedAt: new Date()
        });

        if (file) {
            await Log.create({
                userId: userId,
                action: "FILE_DELETED",
                fileId: req.params.id,
                details: `Deleted file: ${file.originalName}`
            });
        }

        res.json({ message: "File deleted successfully", success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};

