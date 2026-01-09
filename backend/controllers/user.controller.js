const User = require("../models/User");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// 1. CREATE USER
exports.createUser = async (req, res) => {
    const { role, username } = req.body;
    const creatorRoleRaw = req.headers['creator-role'] || "";
    const creatorRole = creatorRoleRaw.trim().toLowerCase();

    try {
        const allowedRolesByCreator = {
            superadmin: ["superadmin", "admin", "hod", "employee"],
            admin: ["hod", "employee"],
            hod: ["employee"],
            employee: [] 
        };

        const requestedRole = (role || "").trim().toLowerCase();
        const allowed = allowedRolesByCreator[creatorRole] || [];

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

        const folderPath = path.join(__dirname, "..", "uploads", user.username);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 2. VERIFY PASSWORD
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

// 3. LOGIN
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, deletedAt: null });
        if (!user || user.password !== password) return res.status(401).json({ message: "Invalid credentials" });
        res.json({ _id: user._id, username: user.username, role: user.role, name: user.name });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 4. GET ALL USERS
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ deletedAt: null }).populate("departmentId");
        res.json(users);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 5. GET USERS BY DEPARTMENT (STRICT ROLE SEPARATION)
exports.getUsersByDepartment = async (req, res) => {
    try {
        const { deptId } = req.params;
        
        const mongoId = mongoose.Types.ObjectId.isValid(deptId) 
            ? new mongoose.Types.ObjectId(deptId) 
            : null;

        const allUsers = await User.find({
            deletedAt: null,
            $or: [
                { departmentId: mongoId },
                { departmentId: deptId },
                { department: deptId }
            ]
        }).lean();

        const hodsOnly = allUsers.filter(u => u.role?.toUpperCase() === "HOD");
        const employeesOnly = allUsers.filter(u => u.role?.toUpperCase() === "EMPLOYEE");

        res.json({
            hods: hodsOnly,
            employees: employeesOnly
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. GET USER BY ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("departmentId");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 7. TOGGLE USER STATUS
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const updated = await User.findByIdAndUpdate(req.params.id, { isActive: !user.isActive }, { new: true });
        res.json({ isActive: updated.isActive });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 8. GET USER FILES (CORRECTED METADATA VERSION)
exports.getUserFiles = async (req, res) => {
    try {
        const { username } = req.params;
        const folderPath = path.join(__dirname, "..", "uploads", username);
        
        if (!fs.existsSync(folderPath)) {
            return res.status(200).json([]); 
        }

        const filenames = fs.readdirSync(folderPath);
        const filesWithMetadata = filenames.map(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath); 
            return {
                name: file,
                size: (stats.size / 1024).toFixed(2) + " KB", 
                createdAt: stats.birthtime 
            };
        });
        res.json(filesWithMetadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 9. SOFT DELETE USER
exports.softDeleteUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
        res.json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};