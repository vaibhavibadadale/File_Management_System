// backend/models/Folder.js

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    parent: {
        // Null means this is a root folder
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null, 
    },
    owner: {
        // Placeholder for user ID if implementing authentication
        type: String, 
        default: 'System',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Folder', folderSchema);