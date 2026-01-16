const mongoose = require("mongoose");

const DeleteRequestSchema = new mongoose.Schema({
  requestType: { type: String, default: "delete" },
  fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
  senderUsername: { type: String, required: true },
  senderRole: { type: String, required: true },
  departmentId: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "completed", "denied"], default: "pending" },
  denialComment: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("DeleteRequest", DeleteRequestSchema, "deleterequests");