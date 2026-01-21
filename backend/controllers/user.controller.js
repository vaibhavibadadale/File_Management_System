const User = require("../models/User");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// 1. CREATE USER
exports.createUser = async (req, res) => {
    try {
        const { 
            username, password, role, departmentId, department, 
            name, email, employeeId, createdByUsername 
        } = req.body;

        const existingUser = await User.findOne({ 
            $or: [{ email }, { employeeId }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: "A user with this Email, Employee ID, or Username already exists." 
            });
        }

        const newUser = new User({ 
            username, password, role, departmentId, department, name, email, employeeId
        });

        await newUser.save();

        // Fetch potential administrators to notify
        const admins = await User.find({ 
            role: { $in: ['Admin', 'SuperAdmin', 'ADMIN', 'SUPERADMIN'] },
            deletedAt: null 
        });

        // FIX: Ensure unique recipient IDs and STRICTLY FILTER OUT the person who created the user
        const uniqueAdmins = Array.from(
            new Map(admins.map(a => [a._id.toString(), a])).values()
        ).filter(a => a.username !== createdByUsername); // Stops self-notification

        if (uniqueAdmins.length > 0) {
            const notificationEntries = uniqueAdmins.map(admin => ({
                recipientId: admin._id,
                targetRoles: ['ADMIN', 'SUPERADMIN'],
                title: "New User Created",
                message: `User "${username}" has been added by ${createdByUsername || 'Admin'}.`,
                type: "USER_CREATED", 
                isRead: false
            }));
            await Notification.insertMany(notificationEntries);
        }

        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
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
        const { username, password, department } = req.body;
        const user = await User.findOne({ username, deletedAt: null }).populate("departmentId");
        
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const userDeptName = user.departmentId?.departmentName || user.department;
        const role = (user.role || "").toLowerCase();

        if (role === "employee" || role === "hod") {
            if (userDeptName !== department) {
                return res.status(401).json({ 
                    message: `Access Denied: You are registered under '${userDeptName}', not '${department}'.` 
                });
            }
        }

        res.json({ 
            _id: user._id, 
            username: user.username, 
            role: user.role, 
            department: userDeptName, 
            departmentId: user.departmentId?._id 
        });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 4. GET ALL USERS
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ deletedAt: null }).populate("departmentId");
        res.json(users);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 5. GET USERS BY DEPARTMENT
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
                { department: deptId }
            ]
        }).lean();

        res.json({ 
            hods: allUsers.filter(u => u.role?.toUpperCase() === "HOD"), 
            employees: allUsers.filter(u => u.role?.toUpperCase() === "EMPLOYEE") 
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

// 8. GET USER FILES (FS Logic)
exports.getUserFiles = async (req, res) => {
    try {
        const { username } = req.params;
        const folderPath = path.join(__dirname, "..", "uploads", username);
        
        if (!fs.existsSync(folderPath)) return res.status(200).json([]); 

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
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: "User not found" });

        await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

        const admins = await User.find({ role: { $in: ['ADMIN', 'SUPERADMIN'] }, deletedAt: null });
        const notifications = admins.map(admin => ({
            recipientId: admin._id,
            targetRoles: ['ADMIN', 'SUPERADMIN'],
            title: "User Account Removed",
            message: `The user account "${userToDelete.username}" has been deactivated.`,
            type: "USER_DELETED",
            isRead: false
        }));
        
        if (notifications.length > 0) await Notification.insertMany(notifications);

        res.json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};