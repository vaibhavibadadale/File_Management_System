const Transfer = require("../models/Transfer");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification"); 
const Trash = require("../models/Trash"); // Ensure Trash is imported

// 1. CREATE TRANSFER REQUEST
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
    const isAutoApprove = roleUpper === "ADMIN" || roleUpper === "SUPERADMIN";

    const senderUser = await User.findOne({ username: senderUsername });
    const recipientUser = recipientId ? await User.findById(recipientId) : null;
    
    const sDept = senderUser ? await Department.findOne({ departmentId: String(senderUser.departmentId) }) : null;
    const rDept = recipientUser ? await Department.findOne({ departmentId: String(recipientUser.departmentId) }) : null;

    const newTransfer = new Transfer({
      senderUsername,
      senderRole,
      recipientId,
      fileIds,
      reason,
      requestType,
      departmentId,
      senderDeptName: sDept?.name || sDept?.departmentName || "N/A",
      receiverDeptName: rDept?.name || rDept?.departmentName || "N/A",
      status: isAutoApprove ? "completed" : "pending"
    });

    if (isAutoApprove) {
      if (requestType === "delete") {
        await handleMoveToTrash(fileIds, senderUsername, "AUTO-ADMIN", departmentId);
      } else {
        await File.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
        await Folder.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
      }
    } else {
      // --- NOTIFY ADMINS/HOD OF NEW REQUEST ---
      const staffToNotify = await User.find({
    $or: [
        { role: { $in: ['Admin', 'SuperAdmin', 'ADMIN', 'SUPERADMIN'] } },
        { role: 'HOD', departmentId: departmentId }
    ]
});

if (staffToNotify.length > 0) {
    // 2. Create a unique notification document for EVERY specific person
    const notificationEntries = staffToNotify
        .filter(staff => staff.username !== senderUsername) // Don't notify the person who made the request
        .map(staff => ({
            recipientId: staff._id, // This links the notification directly to the user
            title: 'New Request Pending',
            message: `A new ${requestType} request has been created by ${senderUsername}.`,
            type: 'REQUEST_NEW',
            targetRoles: [staff.role], // Keep this for your current frontend logic
            isRead: false,
            createdAt: new Date()
        }));

    // 3. Insert all notifications into the collection
    await Notification.insertMany(notificationEntries);
  }
}
    await newTransfer.save();
    res.status(201).json({ 
      message: isAutoApprove ? "Action completed immediately" : "Request sent for approval", 
      transfer: newTransfer 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. GET DASHBOARD
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

    let pendingQuery = { status: "pending", ...searchFilter };
    let historyQuery = { status: { $ne: "pending" }, ...searchFilter };

    if (roleUpper === "HOD") {
      pendingQuery = {
        ...pendingQuery,
        $or: [
          { departmentId: departmentId, senderRole: "EMPLOYEE" },
          { senderUsername: username }
        ]
      };
      historyQuery.departmentId = departmentId;
    } else if (roleUpper === "EMPLOYEE") {
      pendingQuery.senderUsername = username;
      historyQuery.senderUsername = username;
    }

    const pendingSkip = (parseInt(pPage) - 1) * parseInt(limit);
    const historySkip = (parseInt(hPage) - 1) * parseInt(limit);

    const [rawMain, totalPending, rawLogs, totalHistory] = await Promise.all([
      Transfer.find(pendingQuery).sort({ createdAt: -1 }).skip(pendingSkip).limit(parseInt(limit)).populate("fileIds").populate("recipientId", "username departmentId").lean(),
      Transfer.countDocuments(pendingQuery),
      Transfer.find(historyQuery).sort({ updatedAt: -1 }).skip(historySkip).limit(parseInt(limit)).populate("fileIds").populate("recipientId", "username departmentId").lean(),
      Transfer.countDocuments(historyQuery),
    ]);

    const processData = async (list) => {
      return Promise.all(list.map(async (item) => {
        const sUser = await User.findOne({ username: item.senderUsername });
        let sDeptFinal = "N/A";
        if (sUser) {
          const d = await Department.findOne({ departmentId: String(sUser.departmentId) });
          sDeptFinal = d?.name || d?.departmentName || "N/A";
        }
        let rDeptFinal = "N/A";
        if (item.recipientId && item.recipientId.departmentId) {
          const d = await Department.findOne({ departmentId: String(item.recipientId.departmentId) });
          rDeptFinal = d?.name || d?.departmentName || "N/A";
        }
        return { ...item, senderDeptName: sDeptFinal, receiverDeptName: rDeptFinal, isActionable: item.senderUsername !== username };
      }));
    };

    res.json({
      mainRequests: await processData(rawMain),
      logs: await processData(rawLogs),
      totalPending,
      totalHistory,
      pendingTotalPages: Math.ceil(totalPending / limit),
      historyTotalPages: Math.ceil(totalHistory / limit),
      currentPendingPage: parseInt(pPage),
      currentHistoryPage: parseInt(hPage),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. APPROVE HANDLER
exports.approveTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { approverUsername } = req.body; 
    
    const transfer = await Transfer.findById(transferId).populate('fileIds');
    if (!transfer) return res.status(404).json({ message: "Request not found" });

    if (transfer.requestType === "delete") {
      await handleMoveToTrash(transfer.fileIds, transfer.senderUsername, approverUsername || "Authorized User", transfer.departmentId);
    } else {
      await File.updateMany({ _id: { $in: transfer.fileIds } }, { $addToSet: { sharedWith: transfer.recipientId } });
      await Folder.updateMany({ _id: { $in: transfer.fileIds } }, { $addToSet: { sharedWith: transfer.recipientId } });
    }

    transfer.status = "completed";
    await transfer.save();

    // --- NOTIFY THE SENDER THAT IT WAS APPROVED ---
    const sender = await User.findOne({ username: transfer.senderUsername });
    if (sender) {
      await Notification.create({
        recipientId: sender._id,
        title: 'Request Approved',
        message: `Your ${transfer.requestType} request has been approved by ${approverUsername}.`,
        type: 'REQUEST_APPROVED',
        isRead: false
      });
    }

    res.status(200).json({ message: "Request approved and processed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. DENY HANDLER
exports.denyTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { denialComment, approverUsername } = req.body;
    
    const transfer = await Transfer.findByIdAndUpdate(transferId, { 
      status: "denied", 
      denialComment: denialComment || "No specific reason" 
    }, { new: true });

    if (!transfer) return res.status(404).json({ message: "Request not found" });

    // --- NOTIFY THE SENDER THAT IT WAS DENIED ---
    const sender = await User.findOne({ username: transfer.senderUsername });
    if (sender) {
      await Notification.create({
        recipientId: sender._id,
        title: 'Request Denied',
        message: `Your ${transfer.requestType} request was denied. Reason: ${denialComment || "N/A"}`,
        type: 'REQUEST_DENIED',
        isRead: false
      });
    }

    res.status(200).json({ message: "Request denied successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

async function handleMoveToTrash(files, sender, approver, deptId) {
    for (const file of files) {
        const fileData = typeof file === 'string' ? await File.findById(file) : file;
        if (!fileData) continue;
        await Trash.create({
            originalName: fileData.originalName,
            path: fileData.path,
            size: fileData.size,
            mimetype: fileData.mimetype,
            originalFileId: fileData._id,
            deletedBy: sender,
            approvedBy: approver,
            departmentId: deptId,
            reason: "Approved Request"
        });
        await File.findByIdAndDelete(fileData._id);
    }
}