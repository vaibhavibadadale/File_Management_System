const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    parent: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Folder", 
        default: null // Crucial for top-level folders
    },
    createdBy: { type: String, default: "Admin" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Folder", FolderSchema);