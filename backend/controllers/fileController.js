const File = require('../models/File');
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { getFolderPathNames } = require('../utils/pathResolver');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// --- 1. createFileEntry ---
exports.createFileEntry = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        const uniqueFilename = req.file.filename;
        const { originalname, size, mimetype } = req.file;
        const folderId = req.body.folderId || null;
        const uploadedBy = req.body.uploadedBy || "Unknown";

        let relativePath;
        if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
            relativePath = path.join(folderId.toString(), uniqueFilename);
        } else {
            relativePath = uniqueFilename;
        }

        const newFile = new File({
            originalname,
            filename: uniqueFilename,
            mimetype,
            size,
            path: relativePath,
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

// --- 2. getAllFiles ---
exports.getAllFiles = async (req, res) => {
    try {
        const { folderId } = req.query;
        const query = folderId ? { folder: folderId } : {};

        const files = await File.find(query)
            .select('originalname filename size folder uploadedBy path createdAt updatedAt')
            .sort({ createdAt: -1 })
            .lean();

        const filesWithDisplayNames = await Promise.all(files.map(async (file) => {
            let pathNames = await getFolderPathNames(file.folder);
            pathNames.push(file.originalname);
            const fullDisplayName = pathNames.join(' / ');
            return { ...file, fullDisplayName };
        }));

        res.status(200).json({ success: true, files: filesWithDisplayNames });
    } catch (err) {
        console.error("Error fetching files:", err);
        res.status(500).json({ success: false, message: "Failed to retrieve files" });
    }
};

// --- 3. deleteFile (Fixed) ---
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid file ID format." });
        }

        const file = await File.findById(id);
        if (!file) {
            return res.status(404).json({ success: false, message: "File not found in database." });
        }

        const filePath = path.join(UPLOADS_DIR, file.path);

        // ✅ Delete physical file safely
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await File.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: `File '${file.originalname}' deleted successfully.`,
        });
    } catch (error) {
        console.error("Error in deleteFile:", error);
        res.status(500).json({
            success: false,
            message: "Server error during file deletion: " + error.message,
        });
    }
};
