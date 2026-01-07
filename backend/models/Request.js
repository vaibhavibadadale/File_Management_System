const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    requestType: { type: String, enum: ['transfer', 'delete'], required: true },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    senderUsername: { type: String, required: true },
    senderDepartment: { type: String }, // <--- THIS MUST BE A STRING
    departmentId: { type: String },     // Keep for HOD filtering
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);