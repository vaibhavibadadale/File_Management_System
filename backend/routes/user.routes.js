const express = require("express");
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  softDeleteUser,
  getUsers,
  login,
  getUsersByDepartment
} = require("../controllers/user.controller");

// Create user (and folder)
router.post("/", createUser);

// Get all users (detailed)
router.get("/", getAllUsers);

// Get active users (limited fields)
router.get("/active", getUsers);

// Get specific user by ID
router.get("/:id", getUserById);

// Soft delete user
router.delete("/:id", softDeleteUser);

router.post("/login", login);

// router.get("/department/:deptId", getUsersByDepartment);
router.get("/department/:deptId", getUsersByDepartment);

module.exports = router;