const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema({
    fileName: String,
    filePath: String,
    createdBy: String,
    file: Buffer,
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder",
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("Upload", uploadSchema);
