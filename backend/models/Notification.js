const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // Direct link to the User (The owner of the file or the specific person alerted)
    recipientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    }, 
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String }, // e.g., 'FILE_DISABLED', 'TRANSFER_REQUEST', 'USER_CREATED'
    isRead: { type: Boolean, default: false },
    // Metadata for filtering
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of the specific File or Request
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    targetRoles: [{ type: String }] // For broadcast notifications (ADMIN, HOD)
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);