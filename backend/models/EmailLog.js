const mongoose = require("mongoose");

const EmailLogSchema = new mongoose.Schema({
    recipient: { type: String, required: true },
    senderName: { type: String }, 
    subject: { type: String, required: true },
    content: { type: String }, 
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String },   
    sentAt: { type: Date, default: Date.now },
    triggerAction: { type: String } 
});

module.exports = mongoose.model("EmailLog", EmailLogSchema);