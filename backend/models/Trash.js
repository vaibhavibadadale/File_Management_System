const mongoose = require("mongoose");

const TrashSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String },
    originalFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    
    // --- PRESERVATION FIELDS (For original location/owner) ---
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    username: { type: String }, // Original owner's username
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },

    // --- DELETION METADATA ---
    deletedBy: { type: String }, // Username of person who initiated delete
    senderRole: { type: String },
    approvedBy: { type: String }, // Person who approved the request
    departmentName: { type: String },
    reason: { type: String },
    deletedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Trash || mongoose.model("Trash", TrashSchema);