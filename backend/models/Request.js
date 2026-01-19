const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    requestType: { type: String, enum: ['transfer', 'delete'], required: true },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    senderUsername: { type: String, required: true },
    senderRole: { type: String }, 
    senderDeptName: { type: String },
    departmentId: { type: String }, // Stored for filtering
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiverName: { type: String },
    receiverDeptName: { type: String },
    receiverRole: { type: String },
    reason: { type: String },
    denialComment: { type: String },
    status: { type: String, default: 'pending', enum: ['pending', 'completed', 'denied'] }
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);