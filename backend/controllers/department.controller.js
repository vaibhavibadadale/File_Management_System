const Department = require("../models/Department");
const User = require("../models/User"); // Path to your User model
const bcrypt = require("bcryptjs");

// Create Department - Kept as is
exports.createDepartment = async (req, res) => {
    try {
        const department = await Department.create(req.body);
        res.status(201).json(department);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "Department Name or Code already exists!" });
        }
        res.status(400).json({ error: error.message });
    }
};

// Get All - Kept with your logic
exports.getAllDepartments = async (req, res) => {
    try {
        const showHidden = req.query.hidden === 'true';
        const filter = {
            deletedAt: null,
            isActive: showHidden ? false : { $ne: false }
        };
        const departments = await Department.find(filter);
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Toggle Status - Verification against real User Password
exports.toggleDepartmentStatus = async (req, res) => {
    try {
        const { password, userId } = req.body; // userId can come from req.user if using Auth middleware
        const department = await Department.findById(req.params.id);
        
        if (!department) return res.status(404).json({ error: "Department not found" });

        // Logic: Verify password only when deactivating
        if (department.isActive === true) {
            if (!password) return res.status(400).json({ error: "Password is required for deactivation" });

            // 1. Find the user attempting the action
            const user = await User.findById(userId || req.user.id);
            if (!user) return res.status(404).json({ error: "User not found" });

            // 2. Compare provided password with hashed password in DB
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: "Invalid password. Action unauthorized." });
            }
        }

        department.isActive = !department.isActive;
        await department.save();
        res.json(department);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};