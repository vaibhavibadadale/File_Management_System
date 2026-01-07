const Log = require("../models/Log");

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await Log.find({ deletedAt: null })
      .populate("userId", "name email")
      .populate("fileId", "filename")
      .populate("folderId", "folderName")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};