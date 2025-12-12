const User = require('../models/User');
const Folder = require('../models/Folder');
const path = require('path');
const fs = require('fs');

exports.createUser = async (req, res) => {
  try {
    const { role, department, name, email, username, password } = req.body;

    // Create new user
    const user = new User({ role, department, name, email, username, password });
    await user.save();

    // Create user's root folder
    const folderPath = path.join(__dirname, `../uploads/${username}`);

    // Create folder in file system (if not exists)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Store folder info in database
    const folder = new Folder({
      name: username,
      path: `/uploads/${username}`,
      createdBy: username
    });
    await folder.save();

    res.status(201).json({ message: 'User and root folder created successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
};
