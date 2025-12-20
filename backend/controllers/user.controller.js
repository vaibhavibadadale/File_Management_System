const User = require("../models/User");

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null })
      .populate("departmentId");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Look for this function
exports.getUsers = async (req, res) => {
    try {
        // UPDATE THIS LINE HERE
        const users = await User.find({ isActive: true }).select("name email employeeId");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("departmentId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date()
    });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
