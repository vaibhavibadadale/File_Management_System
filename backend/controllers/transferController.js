// controller/transferController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.secureTransfer = async (req, res) => {
    const { senderUsername, password, recipientId, fileIds } = req.body;

    try {
        // Find the sender
        const user = await User.findOne({ username: senderUsername });
        
        // Compare entered password with the hashed login password in DB
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password. Transfer blocked." });
        }

        // Logic to link files to the recipient...
        // ... (e.g., Update your File database to include the recipientId)

        res.status(200).json({ message: "Files successfully shared!" });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};