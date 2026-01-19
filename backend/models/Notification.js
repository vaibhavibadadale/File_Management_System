const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    targetRoles: [{ type: String }], // ['ADMIN', 'SUPERADMIN', 'HOD', 'EMPLOYEE']
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['REQUEST_NEW', 'REQUEST_APPROVED', 'REQUEST_DENIED', 'USER_CREATED', 'VENTURE_CREATED'] },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);