const User = require("../models/User");
const fs = require("fs");
const path = require("path");

// 1. CREATE USER (Strict Hierarchy Enforcement)
exports.createUser = async (req, res) => {
    const { role, username } = req.body;
    // Get creator role from the header we send from Frontend
    const creatorRoleRaw = req.headers['creator-role'] || "";
    const creatorRole = creatorRoleRaw.trim().toLowerCase();

    try {
        // Hierarchy Definition
        const allowedRolesByCreator = {
            superadmin: ["superadmin", "admin", "hod", "employee"],
            admin: ["hod", "employee"],
            hod: ["employee"],
            employee: [] 
        };

        const requestedRole = (role || "").trim().toLowerCase();
        const allowed = allowedRolesByCreator[creatorRole] || [];

        // Server-side block
        if (!allowed.includes(requestedRole)) {
            return res.status(403).json({
                error: `Access Denied: As a ${creatorRole}, you cannot create a ${role}.`
            });
        }

        const userData = {
            ...req.body,
            employeeId: req.body.employeeId || `EMP-${Date.now()}`,
        };

        const user = await User.create(userData);

        // Folder creation
        const folderPath = path.join(__dirname, "..", "uploads", user.username);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 2. VERIFY PASSWORD (Fixes the crash error)
exports.verifyPassword = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Standard User Methods ---
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, deletedAt: null });
        if (!user || user.password !== password) return res.status(401).json({ message: "Invalid credentials" });
        res.json({ _id: user._id, username: user.username, role: user.role, name: user.name });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ deletedAt: null }).populate("departmentId");
        res.json(users);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getUsersByDepartment = async (req, res) => {
    try {
        const users = await User.find({ departmentId: req.params.deptId, deletedAt: null });
        res.json(users);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("departmentId");
        res.json(user);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const updated = await User.findByIdAndUpdate(req.params.id, { isActive: !user.isActive }, { new: true });
        res.json({ isActive: updated.isActive });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getUserFiles = async (req, res) => {
    try {
        const folderPath = path.join(__dirname, "..", "uploads", req.params.username);
        if (!fs.existsSync(folderPath)) return res.status(404).json({ message: "Not found" });
        const files = fs.readdirSync(folderPath).map(file => ({ name: file }));
        res.json(files);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.softDeleteUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
        res.json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};