const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    senderUsername: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    passwordUsed: { type: String },
    transferDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transfer", TransferSchema);