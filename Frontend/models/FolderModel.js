const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    parentFolder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder",
        default: null,
    },
    createdBy: {
        type: String,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.models.Folder || mongoose.model("Folder", folderSchema);