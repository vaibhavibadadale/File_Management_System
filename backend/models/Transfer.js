const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
    // Standardize on 'fileIds'
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File", required: true }],
    senderUsername: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Important: Do NOT store the actual password here for security
    transferDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transfer", TransferSchema);