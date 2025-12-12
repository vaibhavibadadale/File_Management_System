const Folder = require("../models/Folder");
const path = require("path");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

exports.createFolder = async (req, res) => {
  try {
    const { name, parent, createdBy } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Folder name is required." });
    }

    const exists = await Folder.findOne({ name, parent: parent || null });
    if (exists) {
        return res.status(409).json({ success: false, message: "Folder with this name already exists in the current location." });
    }

    const newFolder = new Folder({ name, parent: parent || null, createdBy });
    await newFolder.save();

    const folderPath = path.join(UPLOADS_DIR, newFolder._id.toString());
    newFolder.path = newFolder._id.toString(); 
    await newFolder.save(); 

    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    res.status(201).json({ success: true, message: "Folder created successfully", folder: newFolder });
  } catch (err) {
    console.error("Error creating folder:", err);
    res.status(500).json({ success: false, message: "Error creating folder", error: err.message });
  }
};

exports.getAllFolders = async (req, res) => {
  try {
    const { parentId } = req.query; 

    const query = { parent: parentId || null }; 

    const folders = await Folder.find(query).populate("parent", "name");
    res.status(200).json({ success: true, folders });
  } catch (err) {
    console.error("Error fetching folders:", err);
    res.status(500).json({ success: false, message: "Error fetching folders", error: err.message });
  }
};