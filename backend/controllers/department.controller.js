const Department = require("../models/Department");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.createDepartment = async (req, res) => {
    try {
        const department = await Department.create(req.body);
        res.status(201).json(department);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "Department Name or Code already exists!" });
        }
        res.status(400).json({ error: error.message });
    }
};

// UPDATED: Now returns all departments so they appear on the same page
exports.getAllDepartments = async (req, res) => {
    try {
        // We removed the 'isActive' filter requirement 
        // to show both Active and Inactive depts in one list
        const filter = {
            deletedAt: null
        };
        
        const departments = await Department.find(filter).sort({ createdAt: -1 });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// KEPT: Simplified toggle logic without password requirement
exports.toggleDepartmentStatus = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ error: "Department not found" });
        }

        // Logic: Simply flip the status (true to false, or false to true)
        // If isActive is undefined or true, it becomes false. If false, it becomes true.
        department.isActive = department.isActive === false ? true : false;
        
        await department.save();
        res.json(department);
    } catch (error) {
        console.error("Toggle Status Error:", error.message);
        res.status(500).json({ error: "Server Error" });
    }
};