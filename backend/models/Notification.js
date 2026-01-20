import mongoose from 'mongoose';

// models/Notification.js
const NotificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    targetRoles: [{ type: String }],
    department: { type: String }, // <--- Make sure this is "department" NOT "departmentId"
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String },
    isRead: { type: Boolean, default: false } 
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);