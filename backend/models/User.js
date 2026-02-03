const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { type: String, required: true, select: false }, 
    department: { type: String }, 
    role: {
      type: String,
      enum: ["Employee", "HOD", "Admin", "SuperAdmin", "EMPLOYEE", "ADMIN", "SUPERADMIN", "SUPER_ADMIN"],
      required: true
    },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    isActive: { type: Boolean, default: true },
    
    // --- NEW FIELDS FOR ADMIN-INITIATED RESET ---
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
    resetAuthorizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    
    deletedAt: { type: Date, default: null },
    twoFactorSecret: { type: String, default: null },
    is2FAEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Hashing Middleware (Keep your existing one, it handles encryption automatically)
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);