const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // Direct notification to a specific person
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    
    // Notification for anyone with these roles (e.g., ['ADMIN', 'SUPERADMIN'])
    targetRoles: [{ type: String }],
    
    // Used for HOD filtering (String name like "IT" or "HR")
    department: { type: String }, 
    
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String },
    isRead: { type: Boolean, default: false } 
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);