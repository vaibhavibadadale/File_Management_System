const mongoose = require("mongoose");

const DeleteRequestSchema = new mongoose.Schema({
  requestType: { type: String, default: "delete" },
  fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
  senderUsername: { type: String, required: true },
  senderRole: { type: String, required: true },
  departmentId: { type: String, required: true }, // Used for HOD filtering
  reason: { type: String, required: true },
  
  // --- UI/History Fields ---
  // Storing these ensures the dashboard stays fast and data persists 
  // even if users/departments are modified later.
  senderDeptName: { type: String, default: "N/A" },
  receiverName: { type: String, default: "SYSTEM" },
  receiverDeptName: { type: String, default: "TRASH" },
  receiverRole: { type: String, default: "SYSTEM" },
  // -------------------------

  status: { 
    type: String, 
    enum: ["pending", "completed", "denied"], 
    default: "pending" 
  },
  denialComment: { type: String, default: "" }
}, { timestamps: true });

// Explicitly forcing the collection name to 'deleterequests'
module.exports = mongoose.model("DeleteRequest", DeleteRequestSchema, "deleterequests");