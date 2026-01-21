const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    requestType: { type: String, enum: ['transfer', 'delete'], required: true },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    senderUsername: { type: String, required: true },
    
    // String name used for the notification message display
    senderDeptName: { type: String }, 
    
    // The actual Object ID used for HOD dashboard filtering logic
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, 
    
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiverName: { type: String },
    receiverDeptName: { type: String },
    
    reason: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'denied'], default: 'pending' },
    denialComment: { type: String } // Added to store why an HOD/Admin rejected it
}, { timestamps: true });

module.exports = mongoose.models.Request || mongoose.model("Request", RequestSchema);