const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // 'parent' holds the ObjectId of the parent folder
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
  createdBy: { type: String, required: true },
  // path is optional and can be derived, but we keep it for simplicity
  path: { type: String }, 
}, { timestamps: true });

// Ensure unique name within the same parent folder
folderSchema.index({ name: 1, parent: 1 }, { unique: true });

module.exports = mongoose.model("Folder", folderSchema);