const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema(
  {
    departmentName: { type: String, required: true, unique: true },
    departmentCode: { type: String, required: true, unique: true },
    description: { type: String },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Department ||
  mongoose.model("Department", DepartmentSchema);
