const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File", required: true }],
    senderUsername: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'rejected'], 
        default: 'completed' 
    },
    transferDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transfer", TransferSchema);