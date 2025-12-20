const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["EMPLOYEE", "ADMIN", "HOD", "SUPER_ADMIN"],
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
