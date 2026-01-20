import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    targetRoles: [{ type: String }],
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);