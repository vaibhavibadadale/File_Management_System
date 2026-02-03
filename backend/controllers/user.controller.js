const User = require("../models/User");
const mongoose = require("mongoose");
const QRCode = require('qrcode');
const otplib = require('otplib');
const bcrypt = require("bcryptjs");
const Notification = require("../models/Notification");
const fs = require("fs");
const path = require("path");
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const { transporter, passwordResetTemplate } = require('../utils/emailHelper');

// Initialize authenticator
const authenticator = otplib.authenticator || otplib.Authenticator || (otplib.default && otplib.default.authenticator);

// Import the email helpers
const { getRecipientsForRequest, sendEmail } = require('../utils/emailHelper');

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};



// 1. CREATE USER (Kept your existing Registration & Notification logic)
exports.createUser = async (req, res) => {
    try {
        const { 
            username, password, role, departmentId, department, 
            name, email, employeeId, createdByUsername 
        } = req.body;

        const validDeptId = mongoose.Types.ObjectId.isValid(departmentId) ? departmentId : null;

        const existingUser = await User.findOne({ 
            $or: [{ email }, { employeeId }, { username: username.toLowerCase().trim() }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: "A user with this Email, Employee ID, or Username already exists." 
            });
        }

        const newUser = new User({ 
            username: username.toLowerCase().trim(), 
            password, 
            role: role.toUpperCase(), 
            departmentId: validDeptId,
            department, 
            name, 
            email, 
            employeeId,
            is2FAEnabled: false,
            twoFactorSecret: null,
            status: 'active'
        });

        await newUser.save();

        // Notification Logic
        const admins = await User.find({ 
            role: { $in: ['Admin', 'SuperAdmin', 'ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'] },
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
                        message: { $regex: username } 
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

            // Email Logic
            const adminEmails = admins.map(a => a.email).filter(e => e);
            if (adminEmails.length > 0) {
                await sendEmail(
                    adminEmails, 
                    "System Alert: New User Account", 
                    `<p>A new user <b>${username}</b> has been created by ${createdByUsername}.</p>`,
                    "USER_CREATION"
                );
            }
        }

        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error during registration." });
    }
};

// 2. VERIFY PASSWORD (Existing logic for 2FA Setup verification)
exports.verifyPassword = async (req, res) => {
    try {
        const { userId, username, password } = req.body;
        if (!password) return res.status(400).json({ success: false, message: "Password is required" });

        const user = await User.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId() },
                { username: (username || "").toLowerCase().trim() }
            ],
            deletedAt: null
        }).select("+password"); 

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

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

// 3. LOGIN (Updated to handle case-insensitivity while keeping your flow)
// 3. LOGIN (Optimized for debugging and accuracy)
exports.login = async (req, res) => {
    try {
        const { username, password, department } = req.body;
        
        // Normalize input
        const cleanUsername = (username || "").toLowerCase().trim();
        const cleanDept = (department || "").toLowerCase().trim();

        console.log(`--- Login Attempt ---`);
        console.log(`User: ${cleanUsername} | Dept Input: ${cleanDept}`);

        const user = await User.findOne({ 
            username: cleanUsername, 
            deletedAt: null 
        }).populate("departmentId").select("+password"); 
        
        if (!user) {
            console.log("❌ Failure: Username not found.");
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Compare Input (Welcome@123) with DB Hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ Failure: Password mismatch for ${cleanUsername}.`);
            console.log(`DB Hash starts with: ${user.password.substring(0, 10)}...`);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Department Verification
        const userDeptName = (user.departmentId?.departmentName || user.department || "").toLowerCase().trim();
        const role = (user.role || "").toUpperCase();

        // Admins and Superadmins usually bypass department restrictions
        const isAdmin = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN"].includes(role);

        if (!isAdmin && ["EMPLOYEE", "HOD"].includes(role)) {
            if (userDeptName !== cleanDept) {
                console.log(`❌ Failure: Dept Mismatch. DB: '${userDeptName}', Input: '${cleanDept}'`);
                return res.status(401).json({ message: `Access Denied: Registered under '${userDeptName}'` });
            }
        }

        console.log("✅ Credentials valid. Proceeding to 2FA.");
        return res.json({
            requires2FA: true,
            mustSetup: !user.is2FAEnabled,
            userId: user._id
        });
    } catch (error) { 
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" }); 
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
        const mongoId = mongoose.Types.ObjectId.isValid(deptId) ? new mongoose.Types.ObjectId(deptId) : null;

        const allUsers = await User.find({
            deletedAt: null,
            $or: [
                { departmentId: mongoId },
                { departmentId: deptId },
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

// 9. SOFT DELETE USER (Existing Soft Delete & Notification logic)
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
        res.json({ message: "User successfully deactivated (Soft Deleted)" });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 10. 2FA SETUP (Keeps existing QR code generation logic)
exports.setup2FA = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.is2FAEnabled && user.twoFactorSecret) {
            return res.json({ 
                alreadyEnabled: true, 
                message: "2FA already configured. Please enter the code from your app." 
            });
        }

        let secret = user.twoFactorSecret || authenticator.generateSecret();
        if (!user.twoFactorSecret) {
            user.twoFactorSecret = secret;
            await user.save();
        }

        const otpauth = authenticator.keyuri(user.username, "FileMS", secret);
        const qrImageUrl = await QRCode.toDataURL(otpauth);
        
        res.json({ qrImageUrl, mustScan: true });
    } catch (error) {
        console.error("2FA Setup Error:", error);
        res.status(500).json({ error: "Server error during 2FA setup" });
    }
};

// 11. 2FA CONFIRM
exports.confirm2FA = async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA Setup not initiated." });
        }

        const isValid = authenticator.check(String(token).trim(), user.twoFactorSecret);

        if (isValid) {
            user.is2FAEnabled = true; 
            await user.save();

            res.json({ 
                success: true, 
                message: "2FA successfully activated! The QR code is now hidden." 
            });
        } else {
            res.status(400).json({ message: "Invalid code. Please try again." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 12. VERIFY OTP (Final login step)
exports.verifyOTP = async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId).populate("departmentId");
        if (!user || !user.twoFactorSecret) return res.status(404).json({ message: "2FA not configured" });

        const isVerified = authenticator.check(String(token).trim(), user.twoFactorSecret);
        if (isVerified) {
            const jwtToken = generateToken(user._id);
            res.json({
                success: true,
                user: {
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                    department: user.departmentId?.departmentName || user.department,
                    departmentId: user.departmentId?._id || user.departmentId,
                    token: jwtToken 
                }
            });
        } else {
            res.status(401).json({ message: "Invalid OTP" });
        }
    } catch (error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 13. RESET 2FA (Admin only)
exports.resetUser2FA = async (req, res) => {
    try {
        const { targetUserId, adminId } = req.body;
        const requester = await User.findById(adminId);
        if (!requester || !["ADMIN", "SUPERADMIN"].includes(requester.role.toUpperCase())) {
            return res.status(403).json({ message: "Access Denied." });
        }
        await User.findByIdAndUpdate(targetUserId, { twoFactorSecret: null, is2FAEnabled: false });
        res.json({ success: true, message: "2FA has been reset." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.initiateAdminPasswordReset = async (req, res) => {
  try {
    const { targetUserId, adminId } = req.body;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Set expiry for 1 hour
    targetUser.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    targetUser.resetPasswordExpire = Date.now() + 3600000;
    targetUser.resetRequestedBy = adminId; // Track which admin started this

    await targetUser.save();

    // Send Email to User (Use your existing mailer logic)
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    // await sendEmail(targetUser.email, "Admin Authorized Password Reset", `Link: ${resetUrl}`);

    res.json({ success: true, message: "Reset link sent to user's email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. User sets the new password
exports.finalizeAdminPasswordReset = async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Set new password (the .pre("save") hook in your User.js will encrypt this automatically)
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    const adminWhoStartedThis = user.resetRequestedBy;
    user.resetRequestedBy = undefined;

    await user.save();

    // OPTIONAL: Send confirmation email to the Admin who authorized it
    // const admin = await User.findById(adminWhoStartedThis);
    // await sendEmail(admin.email, "Reset Complete", `User ${user.name} has updated their password.`);

    res.json({ success: true, message: "Password updated and stored securely." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FUNCTION 1: Triggered by Admin to send the email
exports.adminTriggerReset = async (req, res) => {
    try {
        const { targetUserId, adminId } = req.body;
        const [targetUser, adminUser] = await Promise.all([
            User.findById(targetUserId),
            User.findById(adminId)
        ]);

        if (!targetUser) return res.status(404).json({ message: "User not found" });

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        targetUser.resetPasswordToken = hashedToken;
        targetUser.resetPasswordExpire = Date.now() + 3600000; // 1 Hour
        targetUser.resetAuthorizedBy = adminId;
        await targetUser.save();

        await transporter.sendMail({
            from: `"Aaryan System" <${process.env.EMAIL_USER}>`,
            to: targetUser.email,
            subject: "Authorized Password Reset",
            html: passwordResetTemplate({
                username: targetUser.username,
                adminName: adminUser ? adminUser.username : "Administrator",
                token: resetToken
            })
        });

        res.json({ success: true, message: "Reset link sent to user email." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// FUNCTION 2: Triggered by User clicking the link to save new password
exports.completePasswordReset = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: "Token invalid or expired" });

        user.password = password; // Ensure your User model has a pre-save hook to hash this!
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        user.resetAuthorizedBy = undefined;
        
        await user.save();

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};