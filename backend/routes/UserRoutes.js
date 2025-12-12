const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// ✅ Folder Schema (if not already imported elsewhere)
const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
  path: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Folder = require("../models/Folder");


// ✅ Create User + Auto Folder
router.post("/", async (req, res) => {
  const { role, department, name, email, username, password } = req.body;

  try {
    // Check duplicate username
    const exists = await User.findOne({ username });
    if (exists)
      return res.status(400).json({ message: "Username already exists" });

    // Create new user
    const user = new User({ role, department, name, email, username, password });
    await user.save();

    // ✅ Auto-create user folder in file system
    const userFolderPath = path.join(__dirname, `../uploads/${username}`);

    if (!fs.existsSync(userFolderPath)) {
      fs.mkdirSync(userFolderPath, { recursive: true });
    }

    // ✅ Save folder info in MongoDB
    const folder = new Folder({
      name: username,
      path: userFolderPath,
      createdBy: username,
    });
    await folder.save();

    res
      .status(201)
      .json({
        message: `${role} created successfully and folder generated!`,
        user,
        folder,
      });
  } catch (err) {
    console.error("❌ Error creating user:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
