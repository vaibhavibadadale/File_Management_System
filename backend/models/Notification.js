const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // Direct link to the User
    recipientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true // Fast lookup for the "Bell" icon
    }, 
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String }, // e.g., 'TRANSFER_REQUEST', 'USER_CREATED'
    isRead: { type: Boolean, default: false },
    // Metadata for filtering
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of the Request or User created
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);