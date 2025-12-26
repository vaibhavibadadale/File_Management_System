const User = require("../models/User");
const fs = require("fs");
const path = require("path");

exports.createUser = async (req, res) => {
  try {
    // Keep original logic: create user from req.body
    const user = await User.create(req.body);

    // --- NEW LOGIC: Create folder based on username ---
    // This looks for a folder named 'uploads' in your backend root
    const folderPath = path.join(__dirname, "..", "uploads", user.username);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    // ------------------------------------------------

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null }).populate("departmentId");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("name email employeeId");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("departmentId");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ... existing imports and functions (createUser, getAllUsers, etc.)

// At the bottom of user.controller.js
// user.controller.js
exports.login = async (req, res) => {
    try {
        // 1. Get 'username' instead of 'email' from the request body
        const { username, password } = req.body;
        
        console.log("Login attempt for username:", username);

        // 2. Search the database using the 'username' field
        const user = await User.findOne({ username: username });

        if (!user) {
            console.log("User not found in DB with username:", username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // 3. Check if the password matches exactly
        if (user.password !== password) {
            console.log("Password mismatch for username:", username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // 4. Success - Return the user data
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

// This function allows the frontend to fetch only users belonging to a specific department
exports.getUsersByDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    // Querying the User collection for active users matching the clicked Department ID
    const users = await User.find({ 
      departmentId: deptId, 
      deletedAt: null 
    }).select("name role employeeId email"); // Only sending necessary fields
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};