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

        // Generate the URL path for the database
        const finalDbPath = `/uploads/${targetUserFolder}/${nestedPath}${req.file.filename}`;

        const newFile = await File.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            folder: targetFolderId,
            uploadedBy: uploadedBy,
            username: targetUserFolder, // NEW: Saving username for Activity Logs
            departmentId: departmentId,
            size: req.file.size,
            mimeType: req.file.mimetype,
            path: finalDbPath 
        });

        // Log the upload action
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

/* ================= OTHER FILE OPERATIONS ================= */

/**
 * Fetches ALL files for the Dashboard Activity Log.
 * If no folderId is provided, it returns everything (useful for the Log view).
 */
// backend/controllers/file.controller
exports.getFilesByFolder = async (req, res) => {
    try {
        const { folderId, userId, departmentId } = req.query; 
        let query = { deletedAt: null };
        
        // 1. Filter by User OR Shared Access
        if (userId) {
            query.$or = [
                { uploadedBy: userId },
                { sharedWith: userId } // Now checks if the user has received this file
            ];
        }

        if (departmentId) {
            query.departmentId = departmentId;
        }
        
        if (folderId === undefined || folderId === "null" || folderId === null || folderId === "undefined") {
            query.folder = null; 
        } else {
            query.folder = folderId;
        }

        const files = await File.find(query)
            .populate("uploadedBy", "name username")
            .sort({ createdAt: -1 });

        res.json({ files, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};
    

/**
 * Marks a file as deleted without removing it from the disk (Soft Delete).
 */
exports.softDeleteFile = async (req, res) => {
    try {
        const { userId } = req.body;

        const file = await File.findByIdAndUpdate(req.params.id, {
            deletedAt: new Date()
        });

        // Log the deletion action
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