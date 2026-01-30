const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true, lowercase: true, trim: true },
    email: { 
      type: String, 
      unique: true, 
      required: true,
      lowercase: true,
      trim: true,
      // REGEX VALIDATION: Prevents invalid formats like "namegmail.com"
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { type: String, required: true },
    department: { type: String }, 
    role: {
      type: String,
      // Optimized enum: consistent casing makes frontend logic much easier
      enum: ["Employee", "HOD", "Admin", "SuperAdmin", "EMPLOYEE", "ADMIN", "SUPERADMIN", "SUPER_ADMIN"],
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department"
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },

    // --- 2FA FIELDS ---
    twoFactorSecret: { type: String, default: null },
    is2FAEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);