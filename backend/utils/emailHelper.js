const User = require('../models/User');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// 1. CREATE the transporter first
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 2. NOW export it
exports.transporter = transporter;

// 3. YOUR TEMPLATES AND FUNCTIONS

/**
 * EXISTING LOGIC: Finds Admins and HODs for notification
 */
exports.getRecipientsForRequest = async (senderRole, departmentId, senderUsername) => {
    try {
        console.log(`--- DEBUG: Finding Recipients ---`);
        console.log(`Sender: ${senderUsername}, Dept: ${departmentId}`);

        const admins = await User.find({
            role: { $regex: /admin/i }, 
            email: { $exists: true, $ne: "" }
        });

        const hods = departmentId ? await User.find({
            role: { $regex: /^hod$/i },
            departmentId: departmentId,
            email: { $exists: true, $ne: "" }
        }) : [];

        const combined = [...admins, ...hods];
        const uniqueList = [];
        const seenEmails = new Set();

        combined.forEach(user => {
            const email = user.email.toLowerCase().trim();
            if (!seenEmails.has(email) && user.username !== senderUsername) {
                seenEmails.add(email);
                uniqueList.push(user);
            }
        });

        return uniqueList;
    } catch (err) {
        console.error("Error in getRecipientsForRequest:", err);
        return [];
    }
};

/**
 * EXISTING LOGIC: Notifies Admins/HODs of a new request
 */
exports.notifyApprovers = async (staffArray, requestData) => {
    const uniqueRecipients = new Map();
    staffArray.forEach(staff => {
        const cleanEmail = staff.email?.toLowerCase().trim();
        if (cleanEmail && !uniqueRecipients.has(cleanEmail)) {
            uniqueRecipients.set(cleanEmail, staff);
        }
    });

    const emailPromises = Array.from(uniqueRecipients.values()).map(recipient => {
        const t = requestData.requestId.toString(); 
        const i = (recipient.id || recipient._id).toString();

        const approveLink = `${process.env.FRONTEND_URL}/request-action?action=approve&t=${t}&i=${i}`;
        const denyLink = `${process.env.FRONTEND_URL}/request-action?action=deny&t=${t}&i=${i}`;

        return transporter.sendMail({
            from: `"Aaryan System" <${process.env.EMAIL_USER}>`,
            to: recipient.email,
            subject: `Action Required: ${requestData.requestType.toUpperCase()}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px; margin: auto;">
                    <h2 style="color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 10px;">Approval Required</h2>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                        <p><strong>👤 Sender:</strong> ${requestData.senderUsername}</p>
                        <p><strong>📋 Type:</strong> ${requestData.requestType}</p>
                        <p><strong>📂 Files:</strong> <span style="color: #d9534f; font-weight: bold;">${requestData.fileNames}</span></p>
                        <p><strong>📝 Reason:</strong> ${requestData.reason}</p>
                    </div>
                    <div style="margin-top: 25px; text-align: center;">
                        <a href="${approveLink}" style="background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px; display: inline-block;">Approve</a>
                        <a href="${denyLink}" style="background: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Deny</a>
                    </div>
                </div>
            `
        });
    });
    await Promise.all(emailPromises);
};

/**
 * EXISTING LOGIC: Notifies a user when their request is approved/denied
 */
exports.notifyUserOfAction = async (userEmail, action, requestData, comment) => {
    const isApproved = action === 'approve';
    const statusColor = isApproved ? '#28a745' : '#dc3545';
    
    return transporter.sendMail({
        from: `"Aaryan System" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `Request Update: ${isApproved ? 'Approved' : 'Denied'}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px; margin: auto;">
                <h2 style="color: ${statusColor}; text-align: center;">Request ${isApproved ? 'Approved' : 'Denied'}</h2>
                <p>Hello <strong>${requestData.senderUsername}</strong>,</p>
                <p>Your request for <strong>${requestData.requestType}</strong> regarding <b>${requestData.fileNames}</b> has been processed.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-left: 5px solid ${statusColor}; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Status:</strong> ${isApproved ? 'COMPLETED' : 'REJECTED'}</p>
                    ${!isApproved && comment ? `
                        <p style="margin-top: 10px; color: #333;">
                            <strong>💬 Admin Comment/Reason:</strong><br/>
                            <i style="color: #666;">"${comment}"</i>
                        </p>
                    ` : ''}
                </div>
                <p style="font-size: 12px; color: #999; text-align: center;">Aaryan Security System</p>
            </div>
        `
    });
};

/**
 * UPDATED LOGIC: Notifies a specific user when their file status changes
 */
exports.notifyUserOfFileStatus = async (userEmail, userName, fileName, isDisabled, actionBy) => {
    const statusText = isDisabled ? 'DISABLED' : 'ENABLED';
    const statusColor = isDisabled ? '#dc3545' : '#28a745';
    const subject = isDisabled ? 'Security Alert: File Disabled' : 'Update: File Re-enabled';

    return transporter.sendMail({
        from: `"Aaryan System" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: subject,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px; margin: auto;">
                <h2 style="color: ${statusColor}; text-align: center;">File Status Update</h2>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>This is an automated security alert regarding your account activity.</p>
                
                <div style="background: ${isDisabled ? '#fff5f5' : '#f8f9fa'}; padding: 15px; border-left: 5px solid ${statusColor}; margin: 20px 0;">
                    <p style="margin: 0;"><strong>File Name:</strong> ${fileName}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                    <p style="margin: 5px 0 0 0;"><strong>Action By:</strong> ${actionBy}</p>
                </div>
                
                ${isDisabled ? 
                    `<p style="color: #666;">As a result, this file is no longer accessible or visible in your active directory. If you believe this is a mistake, please contact your Department Head (HOD).</p>` : 
                    `<p style="color: #666;">This file has been re-enabled and is now accessible in your directory.</p>`
                }
                
                <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">Aaryan Security System &copy; 2026</p>
            </div>
        `
    });
};

/**
 * CORE FUNCTION: General Purpose Email Sender
 */
exports.sendEmail = async (to, subject, html) => {
    const recipientList = Array.isArray(to) ? to : [to];
    const sendTasks = recipientList.map(email => {
        return transporter.sendMail({
            from: `"Aaryan System" <${process.env.EMAIL_USER}>`,
            to: email, 
            subject: subject,
            html: html
        });
    });

    try {
        const results = await Promise.all(sendTasks);
        return results;
    } catch (err) {
        console.error("Mail Dispatch Error:", err);
        throw err;
    }
};

/**
 * EXISTING LOGIC: Password Reset Template
 */
exports.passwordResetTemplate = (data) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${data.token}`;

    return `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px; margin: auto;">
            <h2 style="color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 10px;">Password Reset Authorized</h2>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p>Hello <strong>${data.username}</strong>,</p>
                <p>An administrator has authorized a password reset for your account as per your request.</p>
                <p><strong>Authorized By:</strong> ${data.adminName}</p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security purposes.</p>
            </div>
            <div style="margin-top: 25px; text-align: center;">
                <a href="${resetUrl}" style="background: #111827; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Set New Password
                </a>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
                Aaryan Security System &copy; 2026
            </p>
        </div>
    `;
};