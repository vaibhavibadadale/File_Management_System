const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    requestType: { type: String, enum: ['transfer', 'delete'], required: true },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    senderUsername: { type: String, required: true },
    senderRole: { type: String }, 
    senderDeptName: { type: String }, 
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, 
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    receiverName: { type: String },
    receiverDeptName: { type: String },
    receiverRole: { type: String },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'denied'], default: 'pending' },
    denialComment: { type: String }
}, { timestamps: true });

// We export this as "Request" but it can handle logic for both types
module.exports = mongoose.models.Request || mongoose.model("Request", RequestSchema);