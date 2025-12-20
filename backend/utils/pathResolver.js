// backend/utils/pathResolver.js

const mongoose = require('mongoose');
// Assume your Folder model is located here:
const Folder = mongoose.models.Folder || require('../models/Folder'); 

/**
 * Recursively fetches the names of all ancestor folders.
 * @param {string | null} folderId - The ID of the current folder whose path we are resolving.
 * @returns {Promise<string[]>} An array of folder names, ordered from root to parent.
 */
async function getFolderPathNames(folderId) {
    if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) {
        return ['home']; // Base case: Start the path with 'home' for the root level
    }

    // Fetch the current folder document
    const folder = await Folder.findById(folderId).select('name parent').lean();

    if (!folder) {
        return ['home'];
    }
    
    // Recursively get the path for the parent folder
    // This is the efficient way to trace the path back to the root ('home')
    const parentPath = await getFolderPathNames(folder.parent);
    
    // Append the current folder's name to the path
    parentPath.push(folder.name);
    
    return parentPath;
}

module.exports = { getFolderPathNames };