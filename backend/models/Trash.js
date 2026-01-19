const mongoose = require("mongoose");

const TrashSchema = new mongoose.Schema({
    // Display Info
    originalName: { type: String, required: true },
    
    // Technical File Info (Crucial for Restore logic)
    path: { type: String },         // The physical storage path
    fileUrl: { type: String },      // The URL if stored on a cloud/server
    size: { type: Number },
    mimetype: { type: String },
    
    // Ownership & Metadata
    ownerUsername: { type: String },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    departmentName: { type: String },
    
    // Audit Trail (Who did what)
    deletedBy: { type: String },    // The requester
    approvedBy: { type: String },   // The Admin/HOD who approved
    deletedAt: { type: Date, default: Date.now },
    
    // Reference to original ID to prevent duplicates on restore
    originalFileId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

// Indexing for faster lookups in large systems
TrashSchema.index({ departmentId: 1 });
TrashSchema.index({ deletedAt: -1 });

module.exports = mongoose.model("Trash", TrashSchema);