const Transfer = require("../models/Transfer");
const DeleteRequest = require("../models/DeleteRequest");
const User = require("../models/User");
const Department = require("../models/Department");
const File = require("../models/File");
const Trash = require("../models/Trash");
const mongoose = require("mongoose");

// --- 1. DIRECT DELETE (For Admins & SuperAdmins) ---
exports.directAdminDelete = async (req, res) => {
  try {
    const { fileIds, senderUsername, reason, departmentId } = req.body;
    
    const filesToMove = await File.find({ _id: { $in: fileIds } });
    if (!filesToMove.length) return res.status(404).json({ message: "No files found" });

    // 1. Create Trash entries
    const trashData = filesToMove.map(f => ({
      ...f.toObject(),
      _id: new mongoose.Types.ObjectId(),
      originalFileId: f._id,
      deletedBy: senderUsername,
      approvedBy: "AUTO-ADMIN", // Shows it was a direct action
      departmentId: departmentId,
      deletedAt: new Date()
    }));
    await Trash.insertMany(trashData);

    // 2. Create a "Completed" record in DeleteRequests for the History log
    const adminLog = new DeleteRequest({
      fileIds,
      senderUsername,
      senderRole: "ADMIN",
      departmentId,
      reason: reason || "Admin direct delete",
      status: "completed", // Bypasses 'pending'
      requestType: "delete"
    });
    await adminLog.save();

    // 3. Delete from main collection
    await File.deleteMany({ _id: { $in: fileIds } });

    res.json({ message: "Files moved to trash and recorded in history." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 2. CREATE REQUEST (For Employees & HODs) ---
exports.createRequest = async (req, res) => {
  try {
    const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
    const senderUser = await User.findOne({ username: senderUsername.toLowerCase() });
    
    if (!senderUser) return res.status(404).json({ message: "User not found" });

    const commonData = {
      fileIds,
      senderUsername: senderUser.username,
      senderRole: senderUser.role,
      departmentId: senderUser.departmentId,
      reason: reason || "",
      status: "pending",
      requestType: requestType || "transfer"
    };

    if (requestType === "delete") {
      const newDelReq = new DeleteRequest(commonData);
      await newDelReq.save();
    } else {
      const newTransferReq = new Transfer({ ...commonData, recipientId });
      await newTransferReq.save();
    }
    res.status(201).json({ message: "Request created for approval" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- 3. GET DASHBOARD DATA (Unified) ---
exports.getPendingDashboard = async (req, res) => {
  try {
    const { role, username, departmentId, pPage = 1, hPage = 1, search = "" } = req.query;
    const limit = 5;
    const roleUpper = role?.toUpperCase();

    let filter = {};
    if (roleUpper === "HOD") {
      filter = { $or: [{ departmentId: departmentId, senderRole: "EMPLOYEE" }, { senderUsername: username }] };
    } else if (!["ADMIN", "SUPERADMIN"].includes(roleUpper)) {
      filter = { senderUsername: username };
    }

    const pSkip = (parseInt(pPage) - 1) * limit;
    const hSkip = (parseInt(hPage) - 1) * limit;

    const [pTrans, pDels, hTrans, hDels, countP1, countP2, countH1, countH2] = await Promise.all([
      Transfer.find({ ...filter, status: "pending" }).populate("fileIds").populate("recipientId").lean(),
      DeleteRequest.find({ ...filter, status: "pending" }).populate("fileIds").lean(),
      Transfer.find({ ...filter, status: { $ne: "pending" } }).populate("fileIds").populate("recipientId").lean(),
      DeleteRequest.find({ ...filter, status: { $ne: "pending" } }).populate("fileIds").lean(),
      Transfer.countDocuments({ ...filter, status: "pending" }),
      DeleteRequest.countDocuments({ ...filter, status: "pending" }),
      Transfer.countDocuments({ ...filter, status: { $ne: "pending" } }),
      DeleteRequest.countDocuments({ ...filter, status: { $ne: "pending" } })
    ]);

    const processData = async (list) => {
      return Promise.all(list.map(async (item) => {
        const sUser = await User.findOne({ username: item.senderUsername });
        let sDept = "N/A";
        if (sUser) {
          const d = await Department.findOne({ departmentId: String(sUser.departmentId) });
          sDept = d?.name || d?.departmentName || "N/A";
        }
        return { ...item, senderDeptName: sDept };
      }));
    };

    res.json({
      mainRequests: await processData([...pTrans, ...pDels].sort((a,b) => b.createdAt - a.createdAt).slice(pSkip, pSkip+limit)),
      logs: await processData([...hTrans, ...hDels].sort((a,b) => b.updatedAt - a.updatedAt).slice(hSkip, hSkip+limit)),
      totalPending: countP1 + countP2,
      totalHistory: countH1 + countH2,
      pendingTotalPages: Math.ceil((countP1 + countP2) / limit),
      historyTotalPages: Math.ceil((countH1 + countH2) / limit)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
// 3. APPROVE REQUEST
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approverUsername = req.user?.username || "Admin";

    let request = await Transfer.findById(id) || await DeleteRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.requestType === "delete") {
      const filesToMove = await File.find({ _id: { $in: request.fileIds } });
      if (filesToMove.length > 0) {
        const trashData = filesToMove.map(f => ({
          ...f.toObject(),
          _id: undefined, // Let MongoDB generate new ID for Trash
          deletedBy: request.senderUsername,
          approvedBy: approverUsername,
          departmentId: request.departmentId,
          originalFileId: f._id,
          deletedAt: new Date()
        }));
        await Trash.insertMany(trashData);
        await File.deleteMany({ _id: { $in: request.fileIds } });
      }
    } else {
      await File.updateMany({ _id: { $in: request.fileIds } }, { ownerId: request.recipientId });
    }
    
    request.status = "completed";
    await request.save();
    res.json({ message: "Approved successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 4. DENY REQUEST
exports.denyRequest = async (req, res) => {
  try {
    const { denialComment } = req.body;
    const { id } = req.params;
    let request = await Transfer.findById(id) || await DeleteRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    
    request.status = "denied";
    request.denialComment = denialComment || "No reason provided";
    await request.save();
    res.json({ message: "Denied successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 5. TRASH HANDLERS
exports.getTrashItems = async (req, res) => {
  try {
    const { role, departmentId } = req.query;
    let query = (role?.toUpperCase() === "HOD") ? { departmentId } : {};
    const items = await Trash.find(query).sort({ deletedAt: -1 });
    res.json(items);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.restoreFromTrash = async (req, res) => {
  try {
    const item = await Trash.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    
    const data = item.toObject();
    const originalId = data.originalFileId;
    
    // Cleanup metadata before recreation
    delete data._id; 
    delete data.deletedAt; 
    delete data.originalFileId;
    delete data.deletedBy;
    delete data.approvedBy;

    await File.create({ ...data, _id: originalId });
    await Trash.findByIdAndDelete(req.params.id);
    res.json({ message: "Restored successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.permanentDelete = async (req, res) => {
  try {
    await Trash.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted from trash" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};