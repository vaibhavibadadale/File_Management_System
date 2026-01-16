const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.post("/login", userController.login);
router.post("/", userController.createUser);
router.get("/", userController.getAllUsers);
router.get("/dept/:deptId", userController.getUsersByDepartment);
router.get("/:id", userController.getUserById);
router.put("/status/:id", userController.toggleUserStatus);
router.post("/verify-password", userController.verifyPassword); 
router.get("/files/:username", userController.getUserFiles);
router.delete("/soft-delete/:id", userController.softDeleteUser);

module.exports = router;