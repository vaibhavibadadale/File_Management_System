const User = require("../models/User");
const fs = require("fs");
const path = require("path");

/**
 * CREATE USER
 * Includes logic for automatic folder creation based on username
 */
exports.createUser = async (req, res) => {
  try {
    // 1. Create user in MongoDB
    const user = await User.create(req.body);

    // 2. --- NEW LOGIC: Create physical folder based on username ---
    // Looks for 'uploads' folder in the backend root directory
    const folderPath = path.join(__dirname, "..", "uploads", user.username);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    // -----------------------------------------------------------

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET ALL USERS
 * Fetches all users who are not soft-deleted and populates department details
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null }).populate("departmentId");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET USERS BY DEPARTMENT
 * Specifically for dividing users into department-wise views (e.g., Ventures staff list)
 */
exports.getUsersByDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    
    // Filters active users matching the specific Department ObjectId
    const users = await User.find({ 
      departmentId: deptId, 
      deletedAt: null 
    }).select("name role employeeId email"); // Optimized to send only needed fields
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching users by department:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * LOGIN
 * Uses username and plaintext password matching as per your current logic
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);

    // 1. Search DB for the username
    const user = await User.findOne({ username: username });

    if (!user) {
      console.log("User not found in DB with username:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 2. Check plaintext password match
    if (user.password !== password) {
      console.log("Password mismatch for username:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 3. Success - Return session data
    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      name: user.name
    });
  } catch (error) {
    console.error("Server Error during login:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET ACTIVE USERS (Simple List)
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("name email employeeId");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET SINGLE USER BY ID
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("departmentId");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * SOFT DELETE USER
 * Instead of removing from DB, we mark the deletedAt timestamp
 */
exports.softDeleteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// user.controller.js
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Toggle the value (defaulting to true if it was undefined)
    const newStatus = user.isActive === false ? true : false;

    // Use findByIdAndUpdate to bypass potential schema validation crashes
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: newStatus } },
      { new: true }
    );

    console.log(`User ${updatedUser.username} status changed to: ${updatedUser.isActive}`);
    res.json({ message: "Status updated", isActive: updatedUser.isActive });
  } catch (error) {
    console.error("Error in toggleUserStatus:", error.message);
    res.status(500).json({ error: "Server crashed while updating status: " + error.message });
  }
};

// user.controller.js
exports.getUserFiles = async (req, res) => {
  try {
    const { username } = req.params;
    // Ensure the path correctly points to your uploads folder
    const folderPath = path.join(__dirname, "..", "uploads", username);

    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ message: "User folder not found on server" });
    }

    const files = fs.readdirSync(folderPath);
    const fileList = files.map(file => {
      const stats = fs.statSync(path.join(folderPath, file));
      return {
        name: file,
        size: (stats.size / 1024).toFixed(2) + " KB",
        createdAt: stats.birthtime
      };
    });

    res.json(fileList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add this to your existing exports
// exports.verifyPassword = async (req, res) => {
//     const { email, password } = req.body;
//     try {
//         const user = await User.findOne({ email });
        
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         // Simple check (or use bcrypt.compare if hashed)
//         const isMatch = (user.password === password); 

//         if (isMatch) {
//             res.json({ success: true });
//         } else {
//             res.json({ success: false, message: "Incorrect password" });
//         }
//     } catch (error) {
//         res.status(500).json({ error: "Server error" });
//     }
// };


