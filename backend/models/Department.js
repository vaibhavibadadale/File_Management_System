const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema(
  {
    departmentName: { type: String, required: true, unique: true },
    departmentCode: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true }, 
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);