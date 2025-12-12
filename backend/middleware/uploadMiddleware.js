// backend/middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Folder = require('../models/Folder'); // We need this to look up the physical path

// Define the root upload directory (should match server.js)
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads'); 

// Configure disk storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const { folderId } = req.body;
        
        // 1. Determine the path
        let folderPathOnDisk = UPLOADS_ROOT;

        if (folderId) {
            try {
                // Look up the Mongoose folder entry to get the calculated 'path'
                const targetFolder = await Folder.findById(folderId).select('path');
                
                if (targetFolder && targetFolder.path) {
                    // Combine the root with the Mongoose path: /server/uploads/finance/reports
                    folderPathOnDisk = path.join(UPLOADS_ROOT, targetFolder.path);
                }
            } catch (error) {
                console.error("Error looking up folder path for Multer:", error);
                // Fallback to root upload path if lookup fails
            }
        }

        // 2. Ensure the directory exists before Multer tries to save the file
        if (!fs.existsSync(folderPathOnDisk)) {
            // This is a safety check; folder creation should ensure this path exists.
            fs.mkdirSync(folderPathOnDisk, { recursive: true });
        }
        
        // Multer callback: Tell it where to save the file
        cb(null, folderPathOnDisk);
    },
    
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp + original extension
        const fileExt = path.extname(file.originalname);
        const fileName = Date.now() + '-' + path.basename(file.originalname, fileExt) + fileExt;
        cb(null, fileName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 50 } // Example limit: 50MB
});

// Export the middleware configured to handle a single file named 'file'
module.exports = upload.single('file');