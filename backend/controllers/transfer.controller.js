const Transfer = require("../models/Transfer");
const File = require("../models/File");
const Folder = require("../models/Folder");

// CREATE TRANSFER REQUEST
exports.createRequest = async (req, res) => {
  try {
    const { 
      senderUsername, 
      senderRole, 
      recipientId, 
      fileIds, 
      reason, 
      requestType, 
      departmentId 
    } = req.body;

    const roleUpper = senderRole?.toUpperCase() || "";
    // Auto-approve if the sender is an Admin or SuperAdmin
    const isAutoApprove = roleUpper === "ADMIN" || roleUpper === "SUPERADMIN";

    const newTransfer = new Transfer({
      senderUsername,
      senderRole,
      recipientId,
      fileIds,
      reason,
      requestType,
      departmentId,
      status: isAutoApprove ? "completed" : "pending"
    });

    // If Admin/SuperAdmin, execute the logic immediately
    if (isAutoApprove) {
      if (requestType === "delete") {
        await File.deleteMany({ _id: { $in: fileIds } });
        await Folder.deleteMany({ _id: { $in: fileIds } });
      } else {
        // Transfer/Share logic: add recipient to sharedWith array
        await File.updateMany(
          { _id: { $in: fileIds } }, 
          { $addToSet: { sharedWith: recipientId } }
        );
        await Folder.updateMany(
          { _id: { $in: fileIds } }, 
          { $addToSet: { sharedWith: recipientId } }
        );
      }
    }

    await newTransfer.save();
    
    res.status(201).json({ 
      message: isAutoApprove ? "Action completed and logged in history" : "Request sent for approval", 
      transfer: newTransfer 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET DASHBOARD
exports.getPendingDashboard = async (req, res) => {
  try {
    const { role, username, departmentId, search = "", pPage = 1, hPage = 1, limit = 10 } = req.query;
    const roleUpper = role?.toUpperCase() || "";
    const searchRegex = new RegExp(search, "i");

    const searchFilter = {
      $or: [
        { senderUsername: { $regex: searchRegex } },
        { reason: { $regex: searchRegex } },
      ],
    };

    // 1. Start with base queries that look at status only
    let pendingQuery = { status: "pending", ...searchFilter };
    let historyQuery = { status: { $ne: "pending" }, ...searchFilter };

    // 2. Apply "Strict" filtering ONLY for HOD and EMPLOYEE
    if (roleUpper === "HOD") {
      // HOD sees their department's employees OR their own requests
      pendingQuery.departmentId = departmentId;
      pendingQuery.$or = [{ senderRole: "EMPLOYEE" }, { senderUsername: username }];
      historyQuery.departmentId = departmentId;
    } 
    else if (roleUpper === "EMPLOYEE") {
      // Employee only sees their own requests
      pendingQuery.senderUsername = username;
      historyQuery.senderUsername = username;
    }
    // Note: If role is ADMIN or SUPERADMIN, we DO NOT add departmentId to the query.
    // This allows them to see all records across all departments.

    const pendingSkip = (parseInt(pPage) - 1) * parseInt(limit);
    const historySkip = (parseInt(hPage) - 1) * parseInt(limit);

    const [mainRequests, totalPending, logs, totalHistory] = await Promise.all([
      Transfer.find(pendingQuery)
        .sort({ createdAt: -1 })
        .skip(pendingSkip)
        .limit(parseInt(limit))
        .populate("fileIds")
        .populate("recipientId", "username"),

      Transfer.countDocuments(pendingQuery),

      Transfer.find(historyQuery)
        .sort({ updatedAt: -1 })
        .skip(historySkip)
        .limit(parseInt(limit))
        .populate("fileIds")
        .populate("recipientId", "username"),

      Transfer.countDocuments(historyQuery),
    ]);

    res.json({
      mainRequests,
      totalPending,
      totalHistory,
      pendingTotalPages: Math.ceil(totalPending / limit),
      historyTotalPages: Math.ceil(totalHistory / limit),
      currentPendingPage: parseInt(pPage),
      currentHistoryPage: parseInt(hPage),
      logs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// APPROVE TRANSFER
exports.approveTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const transfer = await Transfer.findById(transferId);
    if (!transfer) return res.status(404).json({ message: "Request not found" });

    if (transfer.requestType === "delete") {
      await File.deleteMany({ _id: { $in: transfer.fileIds } });
      await Folder.deleteMany({ _id: { $in: transfer.fileIds } });
    } else {
      await File.updateMany({ _id: { $in: transfer.fileIds } }, { $addToSet: { sharedWith: transfer.recipientId } });
      await Folder.updateMany({ _id: { $in: transfer.fileIds } }, { $addToSet: { sharedWith: transfer.recipientId } });
    }

    transfer.status = "completed";
    await transfer.save();

    res.status(200).json({ message: "Request approved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DENY TRANSFER
exports.denyTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { denialComment } = req.body;

    const transfer = await Transfer.findByIdAndUpdate(
      transferId,
      { status: "denied", denialComment: denialComment || "No specific reason provided" },
      { new: true }
    );

    if (!transfer) return res.status(404).json({ message: "Request not found" });

    res.status(200).json({ message: "Request denied successfully", deniedReason: transfer.denialComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};