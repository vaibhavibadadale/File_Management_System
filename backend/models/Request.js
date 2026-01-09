const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    requestType: { type: String, enum: ['transfer', 'delete'], required: true },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    senderUsername: { type: String, required: true },
    senderRole: { type: String }, // Stores 'SuperAdmin', 'Admin', 'HOD', or 'Employee'
    senderDepartment: { type: String }, // Stores the Department Name (e.g., 'IT', 'HR')
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    status: { type: String, default: 'pending' } // 'pending', 'completed', 'denied'
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);