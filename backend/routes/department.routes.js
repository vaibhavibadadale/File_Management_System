const express = require("express");
const router = express.Router();
// const { protect } = require("../middleware/authMiddleware"); // Optional: if you have auth

const {
    createDepartment,
    getAllDepartments,
    toggleDepartmentStatus
} = require("../controllers/department.controller");

router.post("/", createDepartment);
router.get("/", getAllDepartments);

// PATCH: Requires Auth middleware to identify the user
router.patch("/toggle-status/:id", toggleDepartmentStatus);

module.exports = router;