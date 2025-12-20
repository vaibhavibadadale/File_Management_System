const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Folder = require("../models/Folder");

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let targetPath = UPLOADS_ROOT;

      if (req.body.folderId) {
        const folder = await Folder.findById(req.body.folderId);

        if (folder && folder.path) {
          targetPath = path.join(UPLOADS_ROOT, folder.path);
        }
      }

      fs.mkdirSync(targetPath, { recursive: true });
      cb(null, targetPath);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

module.exports = multer({ storage });
