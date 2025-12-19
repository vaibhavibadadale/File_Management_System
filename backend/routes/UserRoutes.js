const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Adjust path to your User model

// GET: http://localhost:5000/api/users
router.get("/", async (req, res) => {
    try {
        // Fetch users, excluding passwords for security
        const users = await User.find({}, "username role _id"); 
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

module.exports = router;