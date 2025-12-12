const File = require('../models/File');
const path = require("path");
const mongoose = require("mongoose");

// NOTE: UPLOADS_DIR is defined but not strictly needed inside the controller
// since Multer handles the physical path, but we keep it for context.
// const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// --- 1. createFileEntry (Final Corrected Version) ---
exports.createFileEntry = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        const uniqueFilename = req.file.filename; 
        
        const { originalname, size, mimetype } = req.file;
        const folderId = req.body.folderId || null; // Could be null for root folder uploads
        const uploadedBy = req.body.uploadedBy || "Unknown"; // Default value added

        // CRITICAL FIX: Construct the file path using ONLY forward slashes ('/') 
        // as required for URL paths, bypassing OS-specific path separators.
        let relativePath;
        
        if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
            // Path structure needed by frontend: folderID/filename
            relativePath = `${folderId}/${uniqueFilename}`; 
        } else {
            // Path structure for root folder: filename
            relativePath = uniqueFilename;
        }
        
        const newFile = new File({
            originalname,
            filename: uniqueFilename, 
            mimetype,
            size,
            path: relativePath, // This URL-friendly path is used by the frontend
            folder: folderId,
            uploadedBy,
        });

        await newFile.save();
        res.status(201).json({ success: true, message: "File uploaded successfully", file: newFile });

    } catch (err) {
        console.error("Error saving file metadata:", err);
        res.status(500).json({ success: false, message: "Failed to save file metadata: " + err.message });
    }
};

// --- 2. getAllFiles (Correct logic for fetching files by folder or globally) ---
exports.getAllFiles = async (req, res) => {
    try {
        const { folderId } = req.query; 

        // If folderId is provided, filter by it. If not (for dashboard), fetch all.
        const query = folderId ? { folder: folderId } : {}; 

        const files = await File.find(query)
            .select('originalname filename size folder uploadedBy path createdAt updatedAt') 
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, files: files });
        
    } catch (err) {
        console.error("Error fetching files:", err);
        res.status(500).json({ success: false, message: "Failed to retrieve files" });
    }
};


exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send("File not found");

        const filePath = path.join(__dirname, "..", "uploads", file.path);

        res.download(filePath, file.originalname);
    } catch (err) {
        res.status(500).send("Error downloading file");
    }
};
