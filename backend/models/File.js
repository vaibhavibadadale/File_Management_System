const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true, unique: true },
    mimeType: { type: String },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    username: { type: String, default: "Admin" },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastViewedAt: { type: Date, default: null },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    uploadedAt: { type: Date, default: Date.now },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    isStarred: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    isDisabled: { type: Boolean, default: false }, // For admin toggle functionality
    deletedAt: { type: Date, default: null },

    // --- TRANSFER LOGIC FIELDS ---
    transferStatus: { 
      type: String, 
      enum: ['none', 'pending', 'received'], 
      default: 'none' 
    },
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },
    lastTransferDate: { 
      type: Date, 
      default: null 
    }
  },
  { timestamps: true }
);

// Middleware to exclude soft-deleted files from queries
FileSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.models.File || mongoose.model("File", FileSchema);