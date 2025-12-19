// routes/transfer.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TransferRecord = require('../models/TransferRecord');

router.post('/secure-send', async (req, res) => {
  const { selectedFiles, recipientId, senderUsername, password } = req.body;

  try {
    // 1. Verify Sender and Password
    const sender = await User.findOne({ username: senderUsername });
    const isMatch = await bcrypt.compare(password, sender.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Authorization denied." });
    }

    // 2. Logic to "Transfer"
    // Instead of moving physical files, we usually create a record in the DB
    // that grants the recipient access to these file IDs.
    const newTransfer = new TransferRecord({
      files: selectedFiles,
      sender: sender._id,
      recipient: recipientId,
      status: 'pending'
    });

    await newTransfer.save();

    res.status(200).json({ message: "Files successfully transferred!" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

module.exports = router;