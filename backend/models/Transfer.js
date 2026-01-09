const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
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

module.exports = mongoose.model("Transfer", TransferSchema);
