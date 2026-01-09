const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File", required: true }],
    senderUsername: { type: String, required: true },
    senderRole: { type: String }, // Added to track hierarchy
    senderDepartment: { type: String }, 
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional for 'delete' type
    requestType: { type: String, enum: ['transfer', 'delete'], default: 'transfer' },
    reason: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'denied'], 
        default: 'pending' 
    },
    departmentId: { type: String },
    transferDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Transfer", TransferSchema);