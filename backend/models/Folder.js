const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema(
  {
    folderName: { type: String, required: true },

    predictedId: {
      type: String,
      required: true,
      unique: true
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null
    },

   path: { type: String },

    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

/* Auto hide soft-deleted folders */
FolderSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});


module.exports =
  mongoose.models.Folder || mongoose.model("Folder", FolderSchema);