const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    senderUsername: { type: String, required: true },
    senderRole: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    reason: { type: String },
    requestType: { type: String, default: "transfer" }, 
    departmentId: { type: String }, 
    
    // --- UI/History Fields ---
    // Storing these ensures the dashboard stays fast and data persists 
    // even if users/departments are modified later.
    senderDeptName: { type: String, default: "N/A" },
    receiverName: { type: String, default: "N/A" },
    receiverDeptName: { type: String, default: "N/A" },
    receiverRole: { type: String, default: "USER" },
    // -------------------------

    status: {
      type: String,
      enum: ["pending", "completed", "denied"],
      default: "pending",
    },
    denialComment: { type: String, default: "" },
  },
  { timestamps: true }
);

// Forces connection to the specific collection 'transferrequests'
module.exports = mongoose.models.Transfer || mongoose.model("Transfer", transferSchema, "transferrequests");