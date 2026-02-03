const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema(
  {
    folderName: { type: String, required: true },
    predictedId: { type: String, required: true, unique: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Added uploadedBy to maintain consistency with the transfer controller logic
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    path: { type: String },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
    isStarred: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // --- NEW FIELDS FOR TRANSFER LOGIC ---
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

/* Auto hide soft-deleted folders */
FolderSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.models.Folder || mongoose.model("Folder", FolderSchema);