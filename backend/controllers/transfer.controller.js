const Transfer = require('../models/Transfer');
const File = require('../models/File');
const User = require('../models/User');

// Verify this name matches exactly
exports.secureTransfer = async (req, res) => {
    const { senderUsername, password, recipientId, fileIds } = req.body;
    try {
        const user = await User.findOne({ 
            username: { $regex: new RegExp(`^${senderUsername}$`, 'i') } 
        });

        if (!user) return res.status(404).json({ message: "Sender account not found." });
        if (password !== user.password) return res.status(401).json({ message: "Incorrect password." });

        const normalizedRole = user.role.toUpperCase().trim();
        let status = "completed"; 
        let responseMessage = "Transfer successful!";

        if (normalizedRole === 'HOD' || normalizedRole === 'EMPLOYEE') {
            status = "pending";
            responseMessage = "Transfer request sent to Admin for approval.";
        }

        const newTransfer = new Transfer({
            fileIds,
            senderUsername: user.username,
            senderRole: user.role,
            recipientId,
            status,
            transferDate: new Date()
        });

        await newTransfer.save();

        if (status === "completed") {
            await File.updateMany(
                { _id: { $in: fileIds } },
                { $set: { uploadedBy: recipientId } }
            );
        }
        res.status(200).json({ message: responseMessage, status });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// Verify this function is exported!
exports.getPendingTransfers = async (req, res) => {
    try {
        const pending = await Transfer.find({ status: 'pending' })
            .populate('recipientId', 'name username');
        res.status(200).json(pending);
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
};

// Verify this function is exported!
exports.approveTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const transfer = await Transfer.findById(transferId);
        if (!transfer) return res.status(404).json({ message: "Not found" });

        await File.updateMany(
            { _id: { $in: transfer.fileIds } },
            { $set: { uploadedBy: transfer.recipientId } }
        );

        transfer.status = "completed";
        await transfer.save();
        res.status(200).json({ message: "Approved!" });
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
};
