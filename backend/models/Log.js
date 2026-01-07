const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File"
    },

    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder"
    },

    ipAddress: { type: String },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Log || mongoose.model("Log", LogSchema);