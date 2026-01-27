/**
 * Email Templates for File Management System
 */

const style = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    border: 1px solid #eee;
    border-radius: 10px;
    overflow: hidden;
`;

const headerStyle = (color) => `
    background-color: ${color};
    color: white;
    padding: 20px;
    text-align: center;
    margin: 0;
`;

const bodyStyle = `padding: 20px;`;
const footerStyle = `
    background-color: #f9f9f9;
    padding: 15px;
    text-align: center;
    font-size: 12px;
    color: #777;
`;

module.exports = {
    // 1. Template for Supervisors (HOD/Admin) when a new request is made
    newRequestTemplate: (data) => `
        <div style="${style}">
            <h2 style="${headerStyle('#007bff')}">New Action Required</h2>
            <div style="${bodyStyle}">
                <p>Hello,</p>
                <p>A new <strong>${data.requestType.toUpperCase()}</strong> request has been submitted that requires your review.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Sender:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.senderUsername}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Role:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.sRole}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Department:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.sDeptName}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reason:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.reason}</td></tr>
                </table>
                <p style="margin-top: 20px; text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                </p>
            </div>
            <div style="${footerStyle}">Aaryan File Management System &copy; 2026</div>
        </div>
    `,

    // 2. Template for the Sender when their request is APPROVED
    approvalTemplate: (data) => `
        <div style="${style}">
            <h2 style="${headerStyle('#28a745')}">Request Approved</h2>
            <div style="${bodyStyle}">
                <p>Hello <strong>${data.username}</strong>,</p>
                <p>Great news! Your request for <strong>${data.requestType}</strong> has been approved by <strong>${data.approverUsername}</strong>.</p>
                <p>Your files have been processed successfully.</p>
            </div>
            <div style="${footerStyle}">Aaryan File Management System &copy; 2026</div>
        </div>
    `,

    // 3. Template for the Sender when their request is DENIED
    denialTemplate: (data) => `
        <div style="${style}">
            <h2 style="${headerStyle('#dc3545')}">Request Denied</h2>
            <div style="${bodyStyle}">
                <p>Hello <strong>${data.username}</strong>,</p>
                <p>Your request for <strong>${data.requestType}</strong> was unfortunately denied by <strong>${data.approverUsername}</strong>.</p>
                <div style="background-color: #fff5f5; border-left: 4px solid #dc3545; padding: 10px; margin: 15px 0;">
                    <strong>Reason for Denial:</strong><br/>
                    ${data.denialComment || "No specific reason provided."}
                </div>
                <p>If you have questions, please contact your department HOD.</p>
            </div>
            <div style="${footerStyle}">Aaryan File Management System &copy; 2026</div>
        </div>
    `
};