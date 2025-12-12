const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalname: { type: String, required: true },
  filename: { type: String, required: true, unique: true }, // Name saved on disk
  mimetype: { type: String },
  size: { type: Number, required: true },
  // Path stores the relative path from the /uploads/ folder. 
  // e.g., '65668b3f1c9d2f2c84a8a5b2/16788888888-document.pdf'
  path: { type: String, required: true }, 
  // 'folder' holds the ObjectId of the parent folder
  folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
  uploadedBy: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.File || mongoose.model("File", fileSchema);