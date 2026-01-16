const Transfer = require("../models/Transfer");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Department = require("../models/Department");

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

    // If Admin/Superadmin, perform action immediately
    if (isAutoApprove) {
      if (requestType === "delete") {
        await handleMoveToTrash(fileIds, senderUsername, "AUTO-ADMIN", sDept);
      } else {
        await File.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
        await Folder.updateMany({ _id: { $in: fileIds } }, { $addToSet: { sharedWith: recipientId } });
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
// 2. GET DASHBOARD (WITH REAL-TIME DEPT LOOKUP)
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

    // HOD LOGIC: See employee requests AND own requests
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

    // THE FIX: FETCH DEPARTMENT NAMES FROM USER COLLECTION REAL-TIME
    const processData = async (list) => {
      return Promise.all(list.map(async (item) => {
        // 1. Get Sender Dept Name
        const sUser = await User.findOne({ username: item.senderUsername });
        let sDeptFinal = "N/A";
        if (sUser) {
          const d = await Department.findOne({ departmentId: String(sUser.departmentId) });
          sDeptFinal = d?.name || d?.departmentName || "N/A";
        }

        // 2. Get Receiver Dept Name
        let rDeptFinal = "N/A";
        if (item.recipientId && item.recipientId.departmentId) {
          const d = await Department.findOne({ departmentId: String(item.recipientId.departmentId) });
          rDeptFinal = d?.name || d?.departmentName || "N/A";
        }

        // 3. ACTION LOGIC: If HOD sent it, they can't approve it (Show "Pending")
        const isOwnRequest = item.senderUsername === username;

        return { 
          ...item, 
          senderDeptName: sDeptFinal, 
          receiverDeptName: rDeptFinal,
          isActionable: !isOwnRequest 
        };
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. APPROVE & DENY HANDLERS
exports.approveTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { approverUsername } = req.body; // Pass this from Frontend
    
    const transfer = await Transfer.findById(transferId).populate('fileIds');
    if (!transfer) return res.status(404).json({ message: "Request not found" });

    if (transfer.requestType === "delete") {
      // Instead of deleteMany, we move to Trash
      await handleMoveToTrash(transfer.fileIds, transfer.senderUsername, approverUsername || "Authorized User", transfer.departmentId);
    } else {
      await File.updateMany({ _id: { $in: transfer.fileIds } }, { $addToSet: { sharedWith: transfer.recipientId } });
      await Folder.updateMany({ _id: { $in: transfer.fileIds } }, { $addToSet: { sharedWith: transfer.recipientId } });
    }

    transfer.status = "completed";
    await transfer.save();
    res.status(200).json({ message: "Request approved and processed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// HELPER FUNCTION: To avoid repeating code
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

        // Remove from main collection
        await File.findByIdAndDelete(fileData._id);
    }
}

exports.denyTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { denialComment } = req.body;
    const transfer = await Transfer.findByIdAndUpdate(transferId, { status: "denied", denialComment: denialComment || "No specific reason" }, { new: true });
    if (!transfer) return res.status(404).json({ message: "Request not found" });
    res.status(200).json({ message: "Request denied successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};