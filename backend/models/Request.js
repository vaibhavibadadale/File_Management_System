const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    requestType: { type: String, enum: ['transfer', 'delete'], required: true },
    // Updated to support mixed File and Folder IDs
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, refPath: 'onModel' }],
    onModel: { type: String, enum: ['File', 'Folder'], default: 'File' }, 
    
    senderUsername: { type: String, required: true },
    senderRole: { type: String }, 
    senderDeptName: { type: String }, 
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, 
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    receiverName: { type: String },
    receiverDeptName: { type: String },
    receiverRole: { type: String },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'denied', 'rejected'], default: 'pending' },
    denialComment: { type: String },
    adminComment: { type: String }, 
    actionedBy: { type: String },   
    actionedAt: { type: Date }      
}, { timestamps: true });

module.exports = mongoose.models.Request || mongoose.model("Request", RequestSchema);