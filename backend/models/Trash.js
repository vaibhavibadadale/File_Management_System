const mongoose = require("mongoose");

const TrashSchema = new mongoose.Schema({
    originalName: String,
    fileUrl: String,
    fileId: String,
    ownerUsername: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'departments' },
    departmentName: String,
    deletedBy: String,
    approvedBy: String,
    deletedAt: { type: Date, default: Date.now },
    originalFileId: mongoose.Schema.Types.ObjectId 
});

module.exports = mongoose.model("Trash", TrashSchema);