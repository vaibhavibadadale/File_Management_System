const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },

    // FIXED: controller uses "parent", not parentFolder
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder",
        default: null,
    },

    path: {
        type: String,
        default: "",
    },

    createdBy: {
        type: String,
        required: true,
    },

}, { timestamps: true });

module.exports = mongoose.models.Folder || mongoose.model("Folder", folderSchema);
