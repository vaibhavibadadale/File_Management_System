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
exports.getFilesByFolder = async (req, res) => {
    try {
        const { folderId } = req.query;
        
        let query = { deletedAt: null };
        
        // If folderId is explicitly passed, filter by it. 
        // Otherwise, return all files for the general dashboard.
        if (folderId !== undefined) {
            query.folder = (!folderId || folderId === "null" || folderId === "undefined") ? null : folderId;
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