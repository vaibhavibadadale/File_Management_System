const User = require("../models/User"); // Ensure path is correct
const { authenticator } = require('otplib'); // Must be installed: npm install otplib
const QRCode = require('qrcode'); // Must be installed: npm install qrcode
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    // Replace 'your_jwt_secret' with your actual secret from your .env file
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};
// 1. CREATE USER
exports.createUser = async (req, res) => {
    try {
        const { 
            username, password, role, departmentId, department, 
            name, email, employeeId, createdByUsername 
        } = req.body;

        // Validation: Prevent "Cast to ObjectId" errors
        const validDeptId = mongoose.Types.ObjectId.isValid(departmentId) ? departmentId : null;

        const existingUser = await User.findOne({ 
            $or: [{ email }, { employeeId }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: "A user with this Email, Employee ID, or Username already exists." 
            });
        }

        const newUser = new User({ 
            username, 
            password, 
            role, 
            departmentId: validDeptId,
            department, 
            name, 
            email, 
            employeeId,
            is2FAEnabled: false, // Ensure 2FA is off by default for new setup
            twoFactorSecret: null
        });

        await newUser.save();

        // Optimized Notification Logic (Deduplication Fix)
        const admins = await User.find({ 
            role: { $in: ['Admin', 'SuperAdmin', 'ADMIN', 'SUPERADMIN'] },
            deletedAt: null,
            username: { $ne: createdByUsername } 
        });

        if (admins.length > 0) {
            const operations = admins.map(admin => ({
                updateOne: {
                    filter: { 
                        recipientId: admin._id, 
                        type: "USER_CREATED", 
                        isRead: false,
                        message: { $regex: username } // Check if alert for this user already exists
                    },
                    update: {
                        $set: {
                            recipientId: admin._id,
                            targetRoles: ['ADMIN', 'SUPERADMIN'],
                            title: "New User Created",
                            message: `User "${username}" has been added by ${createdByUsername || 'Admin'}.`,
                            type: "USER_CREATED", 
                            isRead: false,
                            createdAt: new Date()
                        }
                    },
                    upsert: true 
                }
            }));
            await Notification.bulkWrite(operations);
        }

        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error during registration." });
    }
};

exports.verifyPassword = async (req, res) => {
    try {
        const { userId, username, password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required" });
        }

        // Find user by ID (if valid) OR by Username
        const user = await User.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId() },
                { username: username || "" }
            ],
            deletedAt: null
        });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Return success and 2FA status so the frontend knows whether to show OTP or QR
        res.json({ 
            success: true, 
            is2FAEnabled: user.is2FAEnabled,
            mustSetup: !user.twoFactorSecret 
        });
    } catch (error) {
        console.error("Verify Password Error:", error);
        res.status(500).json({ success: false, error: "Internal verification error" });
    }
};
// 3. LOGIN (Updated with migration-safe checks)
exports.login = async (req, res) => {
    try {
        const { username, password, department } = req.body;
        
        // 1. Find User
        const user = await User.findOne({ username, deletedAt: null }).populate("departmentId");
        
        // 2. Auth Check
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const userDeptName = user.departmentId?.departmentName || user.department;
        const role = (user.role || "").toLowerCase();

        // 3. Department Matching
        if (["employee", "hod"].includes(role)) {
            if (userDeptName !== department) {
                return res.status(401).json({ 
                    message: `Access Denied: Registered under '${userDeptName}', not '${department}'.` 
                });
            }
        }

        /**
         * 4. FINAL 2FA LOGIC
         * We check the boolean 'is2FAEnabled'. 
         * If false: The user must see the QR code (First time or Admin Reset).
         * If true: The user only sees the OTP input (Standard login).
         */
        if (user.is2FAEnabled && user.twoFactorSecret) {
            // Standard Flow: Just ask for the 6-digit code
            return res.json({ 
                requires2FA: true, 
                mustSetup: false, 
                userId: user._id 
            });
        } else {
            // Reset Flow: Admin cleared their status, or it's their first time
            return res.json({
                requires2FA: true,
                mustSetup: true, 
                userId: user._id
            });
        }

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

// 8. GET USER FILES
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

        // Update the user to mark as deleted
        await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

        // Notify Admins about the removal
        const admins = await User.find({ 
            role: { $in: ['ADMIN', 'SUPERADMIN'] }, 
            deletedAt: null 
        });

        const notifications = admins.map(admin => ({
            recipientId: admin._id,
            targetRoles: ['ADMIN', 'SUPERADMIN'],
            title: "User Account Removed",
            message: `The user account "${userToDelete.username}" has been deactivated.`,
            type: "USER_DELETED",
            isRead: false
        }));
        
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.json({ message: "User successfully deactivated (Soft Deleted)" });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// --- 2FA CONTROLLERS ---
exports.setup2FA = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Create a unique secret
        const secret = speakeasy.generateSecret({
            name: `FileMS (${user.username})` 
        });

        // Save secret, but don't enable 2FA yet (need verification first)
        user.twoFactorSecret = secret.base32; 
        await user.save();

        const qrImageUrl = await QRCode.toDataURL(secret.otpauth_url);
        res.json({ qrImageUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.confirm2FA = async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA not initiated" });
        }

        const isValid = authenticator.check(String(token).trim(), user.twoFactorSecret);

        if (isValid) {
            await User.findByIdAndUpdate(userId, { is2FAEnabled: true });
            res.json({ success: true, message: "2FA enabled successfully" });
        } else {
            res.status(400).json({ message: "Invalid code, setup failed" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error confirming 2FA", error });
    }
};
exports.verifyOTP = async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.twoFactorSecret) {
            return res.status(404).json({ message: "2FA not configured for this user" });
        }

        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token.trim(),
            window: 1 // Sync buffer
        });

        if (isVerified) {
            // Permanently lock the QR code
            if (!user.is2FAEnabled) {
                user.is2FAEnabled = true;
                await user.save();
            }

            const finalToken = generateToken(user._id);

            res.json({
                success: true,
                user: {
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                    department: user.department || user.departmentId?.departmentName,
                    token: finalToken 
                }
            });
        } else {
            res.status(400).json({ message: "Invalid or expired OTP code" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// ADMIN FUNCTION: Reset 2FA
exports.resetUser2FA = async (req, res) => {
    try {
        const { targetUserId, adminId } = req.body;

        // 1. Find the person who is TRYING to do the reset
        const requester = await User.findById(adminId);
        
        // 2. Strict Check: Only Admin or SuperAdmin allowed
        const allowedRoles = ["ADMIN", "SUPERADMIN"];
        if (!requester || !allowedRoles.includes(requester.role.toUpperCase())) {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: You do not have permission to reset 2FA." 
            });
        }

        // 3. If they are allowed, proceed with the reset
        await User.findByIdAndUpdate(targetUserId, {
            twoFactorSecret: null,
            is2FAEnabled: false
        });

        res.json({ success: true, message: "2FA Secret Key has been cleared." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};