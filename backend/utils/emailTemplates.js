const style = `font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;`;
const headerStyle = (color) => `background-color: ${color}; color: white; padding: 20px; text-align: center; margin: 0;`;
const bodyStyle = `padding: 20px;`;
const footerStyle = `background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;`;

module.exports = {
newRequestTemplate: (data) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        // Use the dynamic email passed from the controller
        const userEmail = data.recipientEmail || 'missing@system.com';
        
        // ENCRYPTION STEP: Convert ID and Email to Base64 to hide them from the URL bar
        const t = Buffer.from(data.requestId.toString()).toString('base64');
        const i = Buffer.from(userEmail).toString('base64');
        
        // Links now use obfuscated 't' and 'i' parameters
        const approveLink = `${frontendUrl}/request-action?action=approve&t=${t}&i=${i}`;
        const denyLink = `${frontendUrl}/request-action?action=deny&t=${t}&i=${i}`;

        return `
        <div style="${style}">
            <h2 style="${headerStyle('#007bff')}">Action Required</h2>
            <div style="${bodyStyle}">
                <p><strong>${data.senderUsername}</strong> has requested a <strong>${data.requestType}</strong>.</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${approveLink}" 
                       style="background-color: #111827; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin-right: 10px; display: inline-block; font-weight: bold;">
                       Approve Request
                    </a>
                    <a href="${denyLink}" 
                       style="background-color: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                       Deny Request
                    </a>
                </div>
                <p style="font-size: 12px; color: #999; text-align: center;">Identity verification required. Verifying as: ${userEmail}</p>
            </div>
            <div style="${footerStyle}">Aaryan File System &copy; 2026</div>
        </div>`;
    },

    actionUpdateTemplate: (data) => `
    <div style="${style}">
        <h2 style="${headerStyle(data.status === 'completed' ? '#28a745' : '#dc3545')}">
            Request ${data.status === 'completed' ? 'Approved' : 'Denied'}
        </h2>
        <div style="${bodyStyle}">
            <p>This is an automated update regarding the <strong>${data.requestType}</strong> request from <strong>${data.senderUsername}</strong>.</p>
            <p><strong>Action Taken By:</strong> ${data.actionedBy}</p>
            <p><strong>New Status:</strong> ${data.status === 'completed' ? 'Approved & Processed' : 'Denied'}</p>
            ${data.denialReason ? `<p><strong>Reason:</strong> ${data.denialReason}</p>` : ''}
            <p style="font-size: 13px; color: #666; border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px;">
                No further action is required from your side.
            </p>
        </div>
        <div style="${footerStyle}">Aaryan File System &copy; 2026</div>
    </div>`,

    fileReceivedTemplate: (data) => `
        <div style="${style}">
            <h2 style="${headerStyle('#17a2b8')}">File Received</h2>
            <div style="${bodyStyle}">
                <p>Hello ${data.receiverName},</p>
                <p><strong>${data.senderName}</strong> is transferring files to you. Once approved by a manager, they will appear in your dashboard.</p>
            </div>
        </div>`,

    newUserTemplate: (data) => `
        <div style="${style}">
            <h2 style="${headerStyle('#6f42c1')}">Welcome to the Team</h2>
            <div style="${bodyStyle}">
                <p>Hello <strong>${data.username}</strong>,</p>
                <p>An account has been created for you in the Aaryan File Management System.</p>
                <p><strong>Your Role:</strong> ${data.role}</p>
                <p>Please login to set your password and start managing files.</p>
                <p style="text-align: center;"><a href="${process.env.FRONTEND_URL}/login" style="background-color: #6f42c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
            </div>
        </div>`,

    passwordResetTemplate: (data) => `
    <div style="font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <h2 style="background-color: #ffc107; color: #212529; padding: 20px; text-align: center; margin: 0;">Password Reset Authorized</h2>
        <div style="padding: 20px;">
            <p>Hello <strong>${data.username}</strong>,</p>
            <p>An administrator has authorized a password reset for your account following your request.</p>
            <p><strong>Authorized By:</strong> Admin (${data.adminName})</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" 
                   style="background-color: #212529; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                   Set New Password
                </a>
            </div>
            
            <p style="font-size: 13px; color: #666; border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px;">
                This link will expire in 1 hour. If you did not request this, please contact IT immediately.
            </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">Aaryan Security System &copy; 2026</div>
    </div>`
};