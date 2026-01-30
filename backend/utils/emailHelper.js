const User = require('../models/User'); 
const EmailLog = require('../models/EmailLog');
const nodemailer = require('nodemailer');

// Setup the transporter using your .env variables
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  // Must be 16-character App Password
  }
});

/**
 * Get recipients based on the sender's role and department hierarchy
 * Ensures that requests move UP the chain of command.
 */
const getRecipientsForRequest = async (senderRole, departmentId) => {
    let emails = [];
    const role = senderRole?.toUpperCase();
    
    // 1. Always notify SuperAdmins for every single request
    const superAdmins = await User.find({ 
        role: { $in: ['SUPERADMIN', 'SUPER_ADMIN'] }, 
        deletedAt: null 
    });
    emails.push(...superAdmins.map(u => u.email));

    // 2. Determine who else needs to see this based on hierarchy
    if (role === 'EMPLOYEE' || role === 'USER') {
        // Employees notify their specific HOD and all Admins
        const hods = await User.find({ role: 'HOD', departmentId: departmentId, deletedAt: null });
        const admins = await User.find({ role: 'ADMIN', deletedAt: null });
        emails.push(...hods.map(u => u.email), ...admins.map(u => u.email));
    } 
    else if (role === 'HOD') {
        // HODs only notify Admins (and SuperAdmins via the top logic)
        const admins = await User.find({ role: 'ADMIN', deletedAt: null });
        emails.push(...admins.map(u => u.email));
    }
    // Note: Admins notify SuperAdmins (already handled above)

    // Return unique, valid emails only (prevents duplicate emails to the same person)
    return [...new Set(emails.filter(email => email))]; 
};

/**
 * Send email and log the result to the EmailLog collection
 */
const sendEmail = async (to, subject, htmlContent, triggerAction = "SYSTEM", senderName = "System") => {
  // Validate recipients: If no one is supposed to receive it, stop here.
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn("⚠️ Email Warning: No recipients found for this action.");
    return;
  }

  try {
    const mailOptions = {
      from: `"Aaryan File System" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject: subject,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Create the Log in MongoDB on success
    await EmailLog.create({
        recipient: mailOptions.to,
        senderName,
        subject,
        content: htmlContent, 
        status: 'sent',
        triggerAction,
        sentAt: new Date()
    });
    
    console.log(`✅ Email successfully sent to: ${mailOptions.to}`);
    return info;
  } catch (error) {
    // Create the Log in MongoDB on failure for troubleshooting
    await EmailLog.create({
        recipient: Array.isArray(to) ? to.join(',') : to,
        senderName,
        subject,
        status: 'failed',
        error: error.message,
        triggerAction,
        sentAt: new Date()
    });
    console.error("❌ Mailer Error logged to database:", error.message);
  }
};

module.exports = { getRecipientsForRequest, sendEmail };