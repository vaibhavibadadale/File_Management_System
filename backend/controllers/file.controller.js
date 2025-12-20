const File = require("../models/File");
const Folder = require("../models/Folder");
const Log = require("../models/Log");
const path = require("path");

exports.uploadFile = async (req, res) => {
    try {
        const { folderId, uploadedBy, departmentId } = req.body;

        // Ensure the ID is valid or null
        const targetFolderId = (!folderId || folderId === "null") ? null : folderId;

        const newFile = await File.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            folder: targetFolderId, // Matches your File Schema
            uploadedBy: uploadedBy,
            departmentId: departmentId,
            size: req.file.size,
            mimeType: req.file.mimetype,
            path: `/uploads/${req.file.filename}`
        });

        res.status(201).json({ message: "File Saved", file: newFile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* ================= OTHER FILE OPERATIONS ================= */

exports.getFilesByFolder = async (req, res) => {
  try {
    // Logic: If folderId is missing or the string "null", we search for folder: null
    const { folderId } = req.query;
    const queryId = (!folderId || folderId === "null" || folderId === "undefined") ? null : folderId;

    const files = await File.find({ folder: queryId, deletedAt: null });
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.softDeleteFile = async (req, res) => {
  try {
    await File.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date()
    });

    await Log.create({
      userId: req.body.userId,
      action: "FILE_DELETED",
      fileId: req.params.id
    });

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
