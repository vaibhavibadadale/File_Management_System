const Transfer = require('../models/Transfer');
const File = require('../models/File');
const User = require('../models/User');

// --- 1. INITIAL TRANSFER REQUEST ---
exports.secureTransfer = async (req, res) => {
    const { senderUsername, password, recipientId, fileIds } = req.body;

    try {
        const user = await User.findOne({ 
            username: { $regex: new RegExp(`^${senderUsername}$`, 'i') } 
        });

        if (!user) return res.status(404).json({ message: "Sender account not found." });
        if (password !== user.password) return res.status(401).json({ message: "Incorrect password." });

        // Logic: Check role for hierarchy
        let status = "completed"; 
        let message = "Transfer successful!";

        // If HOD or Employee, it MUST be a pending request
        if (user.role === 'Employee' || user.role === 'HOD') {
            status = "pending";
            message = "Transfer request sent to Authority for approval.";
        }

        const newTransfer = new Transfer({
            fileIds: fileIds,
            senderUsername: user.username,
            senderRole: user.role, // Track role for the pending list
            recipientId: recipientId,
            status: status,
            transferDate: new Date()
        });

        await newTransfer.save();

        // Execution: Only change ownership if Admin/SuperAdmin
        if (status === "completed") {
            await File.updateMany(
                { _id: { $in: fileIds } },
                { $set: { uploadedBy: recipientId } }
            );
        }

        return res.status(200).json({ message, status });

    } catch (err) {
        return res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// --- 2. APPROVE TRANSFER (For Authority) ---
exports.approveTransfer = async (req, res) => {
    const { transferId } = req.params;
    try {
        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Request not found" });

        // Change ownership only upon approval
        await File.updateMany(
            { _id: { $in: transfer.fileIds } },
            { $set: { uploadedBy: transfer.recipientId } }
        );

        transfer.status = "completed";
        await transfer.save();

        res.status(200).json({ message: "Transfer approved and files moved!" });
    } catch (err) {
        res.status(500).json({ message: "Approval failed", error: err.message });
    }
};

// --- 3. GET PENDING REQUESTS ---
exports.getPendingTransfers = async (req, res) => {
    try {
        const pending = await Transfer.find({ status: 'pending' })
            .populate('recipientId', 'name username');
        res.status(200).json(pending);
    } catch (err) {
        res.status(500).json({ message: "Error fetching requests", error: err.message });
    }
};