const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
<<<<<<< HEAD
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File", required: true }],
    senderUsername: { type: String, required: true },
    senderRole: { type: String }, // Added to track hierarchy
    senderDepartment: { type: String }, 
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional for 'delete' type
    requestType: { type: String, enum: ['transfer', 'delete'], default: 'transfer' },
    reason: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'denied'], 
        default: 'pending' 
    },
    departmentId: { type: String },
    transferDate: { type: Date, default: Date.now }
}, { timestamps: true });
=======
  fileIds: [
    { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true }
  ],
  senderUsername: { type: String, required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: false },
  reason: { type: String, default: "" },
  requestType: { type: String, enum: ["transfer", "delete"], default: "transfer" },
  status: { type: String, enum: ["pending", "completed", "denied"], default: "pending" },
  transferDate: { type: Date, default: Date.now },
  actionLogs: [
    {
      actor: String,
      action: String,
      message: String,
      date: { type: Date, default: Date.now }
    }
  ]
});
>>>>>>> sakshi-features

module.exports = mongoose.model("Transfer", TransferSchema);
