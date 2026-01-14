const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    senderUsername: { type: String, required: true },
    senderRole: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    reason: { type: String },
    requestType: { type: String, default: "transfer" }, 
    departmentId: { type: String }, // Stored as string to match frontend query
    status: {
      type: String,
      enum: ["pending", "completed", "denied"],
      default: "pending",
    },
    denialComment: { type: String, default: "" },
  },
  { timestamps: true }
);

// Forces connection to 'transferrequests'
module.exports = mongoose.model("Transfer", transferSchema, "transferrequests");