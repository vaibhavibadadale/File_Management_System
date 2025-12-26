const Department = require("../models/Department");

exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ deletedAt: null });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
