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
        const { folderId, userId, all } = req.query; 
        
        // SECURITY GATE: Every request must specify which user's data to retrieve
        if (!userId) {
            return res.status(400).json({ success: false, message: "User context missing." });
        }

        let query = { 
            deletedAt: null,
            // Filter: User must be the owner OR the file must be shared with them
            $or: [
                { uploadedBy: userId },
                { sharedWith: userId }
            ]
        };
        
        // If not in 'all' (dashboard) mode, filter by the current folder level
        if (all !== "true") {
            query.folder = (!folderId || folderId === "null") ? null : folderId;
        }

        const files = await File.find(query)
            .populate("uploadedBy", "name username")
            .sort({ createdAt: -1 });

        res.json({ files, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};

exports.trackView = async (req, res) => {
    try {
        const { fileId } = req.body;
        // Updates lastViewedAt for the individual "Recently Viewed" section
        await File.findByIdAndUpdate(fileId, { lastViewedAt: new Date() });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.softDeleteFile = async (req, res) => {
    try {
        const { userId } = req.body;
        const file = await File.findByIdAndUpdate(req.params.id, {
            deletedAt: new Date()
        });

        await Log.create({
            userId: userId,
            action: "FILE_DELETED",
            fileId: req.params.id,
            details: `Deleted file: ${file ? file.originalName : 'Unknown'}`
        });

        res.json({ message: "File deleted successfully", success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};

exports.toggleFileStar = async (req, res) => {
    try {
        const { id } = req.params;
        const { isStarred } = req.body;

        const updatedFile = await File.findByIdAndUpdate(
            id,
            { isStarred },
            { new: true }
        );

        if (!updatedFile) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        res.json({ success: true, file: updatedFile });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};