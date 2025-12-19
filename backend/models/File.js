const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
    originalname: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number },
    folderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Folder", 
        default: null 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("File", FileSchema);