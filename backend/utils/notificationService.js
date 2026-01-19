const Notification = require('../models/Notification');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP provider
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-specific-password' 
    }
});

exports.sendRoleNotification = async ({ type, title, message, deptId, roles, specificUserId }) => {
    try {
        // 1. Save to Database for the UI Bell
        await Notification.create({
            type, title, message, targetRoles: roles,
            departmentId: deptId, recipientId: specificUserId
        });

        // 2. Identify Email Recipients
        let query = {};
        if (specificUserId) {
            query = { _id: specificUserId };
        } else {
            // Find users matching roles. If HOD, also match department.
            query = { 
                $or: [
                    { role: { $in: roles.filter(r => r !== 'HOD') } },
                    { role: 'HOD', departmentId: deptId }
                ] 
            };
        }

        const users = await User.find(query).select('email');
        const emails = users.map(u => u.email).filter(e => e);

        // 3. Send Email
        if (emails.length > 0) {
            await transporter.sendMail({
                from: '"File Management System" <your-email@gmail.com>',
                to: emails,
                subject: title,
                html: `
                    <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px;">
                        <h2 style="color: #2c3e50;">${title}</h2>
                        <p>${message}</p>
                        <hr/>
                        <small>This is an automated system notification.</small>
                    </div>
                `
            });
        }
    } catch (err) {
        console.error("Notification Service Error:", err);
    }
};