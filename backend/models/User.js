const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true, lowercase: true, trim: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    department: { type: String }, 
    role: {
      type: String,
      enum: ["Employee", "HOD", "Admin", "SuperAdmin", "EMPLOYEE", "ADMIN", "SUPER_ADMIN"],
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department"
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);