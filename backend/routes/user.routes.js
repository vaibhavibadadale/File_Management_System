const express = require("express");
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUserById,
  softDeleteUser
} = require("../controllers/user.controller");

router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.delete("/:id", softDeleteUser);
// backend/routes/userRoutes.js
router.get("/", async (req, res) => {
    try {
        const users = await User.find({}, "username _id"); // Only send name and ID
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

module.exports = router;
