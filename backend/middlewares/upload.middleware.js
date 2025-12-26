const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Folder = require("../models/Folder");

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let targetPath = UPLOADS_ROOT;

      // This will now find 'userdemo' because the frontend is sending it
      const username = req.body.username || "Admin";
      console.log(`--- Multer Saving file for user: ${username} ---`);

      targetPath = path.join(targetPath, username);

      if (req.body.folderId && req.body.folderId !== "null" && req.body.folderId !== "undefined") {
        const folder = await Folder.findById(req.body.folderId);
        if (folder && folder.path) {
          targetPath = path.join(targetPath, folder.path);
        }
      }

      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      
      cb(null, targetPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

module.exports = multer({ storage });