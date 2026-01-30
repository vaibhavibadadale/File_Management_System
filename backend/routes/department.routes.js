const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");

// Now we access functions through the departmentController object
router.post("/", departmentController.createDepartment);
router.get("/", departmentController.getAllDepartments);

// PATCH: Toggle status
router.patch("/toggle-status/:id", departmentController.toggleDepartmentStatus);

module.exports = router;