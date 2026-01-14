const Transfer = require("../models/Transfer");
const DeleteRequest = require("../models/DeleteRequest");
const User = require("../models/User");
const File = require("../models/File");
const Trash = require("../models/Trash");

// 1. CREATE REQUEST (Separates Transfer vs Delete into different collections)
exports.createRequest = async (req, res) => {
  try {
    const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
    const senderUser = await User.findOne({ username: senderUsername.toLowerCase() });
    
    if (!senderUser) return res.status(404).json({ message: "Sender not found" });

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

    res.status(201).json({ message: "Request created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET DASHBOARD DATA (Combined fetch from Transfers & DeleteRequests)
exports.getPendingDashboard = async (req, res) => {
  try {
    const { role, username, departmentId, pPage = 1, hPage = 1, search = "" } = req.query;
    const limit = 5;

    let filter = {};
    const roleUpper = role?.toUpperCase();

    // Role-based filtering logic
    if (roleUpper === "HOD") {
      filter = { departmentId: departmentId, senderRole: "EMPLOYEE" };
    } else if (!["ADMIN", "SUPERADMIN"].includes(roleUpper)) {
      filter = { senderUsername: username };
    }

    // Search logic
    if (search) {
      filter.$or = [
        { senderUsername: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } }
      ];
    }

    const pSkip = (parseInt(pPage) - 1) * limit;
    const hSkip = (parseInt(hPage) - 1) * limit;

    // Fetch and Count both collections in parallel
    const [pTrans, pDels, hTrans, hDels, countP1, countP2, countH1, countH2] = await Promise.all([
      Transfer.find({ ...filter, status: "pending" }).populate("fileIds").populate("recipientId").sort({ createdAt: -1 }).skip(pSkip).limit(limit).lean(),
      DeleteRequest.find({ ...filter, status: "pending" }).populate("fileIds").sort({ createdAt: -1 }).skip(pSkip).limit(limit).lean(),
      Transfer.find({ ...filter, status: { $ne: "pending" } }).populate("fileIds").populate("recipientId").sort({ updatedAt: -1 }).skip(hSkip).limit(limit).lean(),
      DeleteRequest.find({ ...filter, status: { $ne: "pending" } }).populate("fileIds").sort({ updatedAt: -1 }).skip(hSkip).limit(limit).lean(),
      Transfer.countDocuments({ ...filter, status: "pending" }),
      DeleteRequest.countDocuments({ ...filter, status: "pending" }),
      Transfer.countDocuments({ ...filter, status: { $ne: "pending" } }),
      DeleteRequest.countDocuments({ ...filter, status: { $ne: "pending" } })
    ]);

    // Attach Department Names manually
    const processData = async (list) => {
      return Promise.all(list.map(async (item) => {
        const sender = await User.findOne({ username: item.senderUsername }).select("departmentName");
        return { 
          ...item, 
          senderDeptName: sender?.departmentName || "N/A",
          receiverDeptName: item.recipientId?.departmentName || "N/A"
        };
      }));
    };

    res.json({
      mainRequests: await processData([...pTrans, ...pDels].slice(0, limit)),
      logs: await processData([...hTrans, ...hDels].slice(0, limit)),
      totalPending: countP1 + countP2,
      totalHistory: countH1 + countH2,
      pendingTotalPages: Math.ceil((countP1 + countP2) / limit),
      historyTotalPages: Math.ceil((countH1 + countH2) / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. APPROVE REQUEST (Moves Delete files to Trash collection)
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
          _id: undefined, 
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
      await File.updateMany(
        { _id: { $in: request.fileIds } },
        { ownerId: request.recipientId }
      );
    }

    request.status = "completed";
    await request.save();
    res.json({ message: "Approved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. DENY REQUEST (Saves denialComment)
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. TRASH HANDLERS (Required for Routes)
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
    delete data._id; delete data.deletedAt; delete data.originalFileId;
    await File.create({ ...data, _id: originalId });
    await Trash.findByIdAndDelete(req.params.id);
    res.json({ message: "Restored" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.permanentDelete = async (req, res) => {
  try {
    await Trash.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};