const Transfer = require("../models/Transfer");
const DeleteRequest = require("../models/DeleteRequest");
const User = require("../models/User");
const File = require("../models/File");
const Trash = require("../models/Trash");

/**
  1. CREATE REQUEST**/
 exports.createRequest = async (req, res) => {
  try {
    const { senderUsername, recipientId, fileIds, reason, requestType } = req.body;
    
    const senderUser = await User.findOne({ username: senderUsername.toLowerCase() });
    if (!senderUser) return res.status(404).json({ message: "User not found" });

    const commonData = {
      requestType: requestType || "transfer",
      fileIds,
      senderUsername: senderUser.username,
      senderRole: senderUser.role,
      departmentId: senderUser.departmentId, // Critical for HOD to see it
      reason: reason || "",
      status: "pending"
    };

    if (requestType === "delete") {
      // SAVE TO deleterequests COLLECTION
      const newDelReq = new DeleteRequest(commonData);
      await newDelReq.save();
    } else {
      // SAVE TO transfers COLLECTION
      const newTransferReq = new Transfer({ ...commonData, recipientId });
      await newTransferReq.save();
    }

    res.status(201).json({ message: "Request sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * 2. APPROVE REQUEST
 * Handles file movement to Trash for deletes and ownership change for transfers
 */
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approverUsername = req.user.username; 

    // CRITICAL: Look in BOTH collections
    let request = await Transfer.findById(id) || await DeleteRequest.findById(id);
    
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.requestType === 'delete') {
      const filesToMove = await File.find({ _id: { $in: request.fileIds } });

      if (filesToMove.length > 0) {
        const trashData = filesToMove.map(f => {
          const fileObj = f.toObject();
          delete fileObj._id; // New ID for Trash record
          return {
            ...fileObj,
            deletedBy: request.senderUsername,
            approvedBy: approverUsername,
            departmentId: request.departmentId,
            originalFileId: f._id, // Saved for Restore function
            deletedAt: new Date()
          };
        });

        await Trash.insertMany(trashData);
        await File.deleteMany({ _id: { $in: request.fileIds } });
      }
    } else {
      // Transfer Logic
      await File.updateMany(
        { _id: { $in: request.fileIds } },
        { ownerId: request.recipientId, ownerUsername: request.recipientUsername }
      );
    }

    request.status = 'completed';
    await request.save();
    res.json({ message: "Request approved and processed." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 3. DENY REQUEST
 */
exports.denyRequest = async (req, res) => {
  try {
    const { denialComment } = req.body;
    const { id } = req.params;

    // Check both collections to find the request
    let request = await Transfer.findById(id) || await DeleteRequest.findById(id);
    
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "denied";
    request.denialComment = denialComment || "No reason provided";
    
    await request.save();

    res.status(200).json({ message: "Request denied successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * 4. GET DASHBOARD DATA
 * Merges both collections for a unified Pending Request page
 */
exports.getPendingDashboard = async (req, res) => {
  try {
    const { role, username, departmentId } = req.query;
    const roleUpper = role?.toUpperCase();
    let filter = {};

    if (roleUpper === "HOD") {
      // HOD sees requests from their department but ONLY if the sender is an EMPLOYEE
      filter = { departmentId: departmentId, senderRole: "EMPLOYEE" };
    } 
    else if (roleUpper === "ADMIN" || roleUpper === "SUPERADMIN") {
      // Admins see EVERYTHING (Requests from HODs and Employees)
      filter = {}; 
    } 
    else {
      // Regular Employees see only their own history
      filter = { senderUsername: username };
    }

    const [transfers, deletes] = await Promise.all([
      Transfer.find(filter).populate("fileIds").populate("recipientId").lean(),
      DeleteRequest.find(filter).populate("fileIds").lean()
    ]);

    const combined = [...transfers, ...deletes];

    const finalData = await Promise.all(combined.map(async (reqObj) => {
      const sender = await User.findOne({ username: reqObj.senderUsername }).select("departmentName");
      return {
        ...reqObj,
        senderDeptName: sender ? sender.departmentName : "N/A",
        // Format display for the "Receiver" column in the table
        receiverInfo: reqObj.requestType === "delete" ? "SYSTEM (TRASH)" : (reqObj.recipientId?.username || "N/A")
      };
    }));

    res.json({
      mainRequests: finalData.filter(r => r.status === "pending").sort((a,b) => b.createdAt - a.createdAt),
      logs: finalData.filter(r => r.status !== "pending").sort((a,b) => b.updatedAt - a.updatedAt)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};