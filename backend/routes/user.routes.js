const express = require("express");
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  softDeleteUser,
  getUsers,
  login,
  getUsersByDepartment,
  toggleUserStatus,
  getUserFiles
} = require("../controllers/user.controller");

// 1. FIXED: Static/Specific POST routes should come first
router.post("/login", login);
// router.post('/verify-password', verifyPassword); 

// 2. Fixed/Specific GET routes
router.get("/", getAllUsers);
router.get("/active", getUsers);
router.get("/department/:deptId", getUsersByDepartment);
router.get("/files/:username", getUserFiles);

// 3. Dynamic routes (the ones with :id) must come LAST
// If these are at the top, they can "swallow" other requests
router.post("/", createUser);
router.get("/:id", getUserById);
router.patch('/toggle-status/:id', toggleUserStatus);
router.delete("/:id", softDeleteUser);

module.exports = router;