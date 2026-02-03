const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const requestController = require("../controllers/request.controller");

// 1. AUTHENTICATION & REGISTRATION (Highest Priority)
router.post("/login", userController.login);
router.post("/verify-password", userController.verifyPassword); 

router.post("/admin-trigger-reset", userController.adminTriggerReset); // For Admin to send mail
router.post("/complete-reset/:token", userController.completePasswordReset); // For User to save new pass

router.post("/", userController.createUser);
router.post("/secure-action/:requestId", requestController.secureAction);

// 2. 2FA SPECIFIC ROUTES (Must stay above /:id)
router.post("/setup-2fa", userController.setup2FA);
router.post("/confirm-2fa", userController.confirm2FA);
router.post("/verify-otp", userController.verifyOTP);
router.post("/reset-2fa", userController.resetUser2FA);

// 3. COLLECTION/GROUP ROUTES
router.get("/", userController.getAllUsers);
router.get("/dept/:deptId", userController.getUsersByDepartment);
router.get("/files/:username", userController.getUserFiles);

// 4. DYNAMIC PARAMETER ROUTES (Lowest Priority - placed at the bottom)
router.get("/:id", userController.getUserById);
router.put("/status/:id", userController.toggleUserStatus);
router.delete("/soft-delete/:id", userController.softDeleteUser);

module.exports = router;