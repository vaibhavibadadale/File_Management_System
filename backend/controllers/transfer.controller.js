const Transfer = require('../models/Transfer');
const File = require('../models/File');
const User = require('../models/User');

exports.secureTransfer = async (req, res) => {
    // 1. Get the data from the request body
    const { senderUsername, password, recipientId, fileIds } = req.body;
    console.log(`--- Controller received: ${senderUsername} ---`);

    try {
        // 2. Find the user (case-insensitive)
        const user = await User.findOne({ 
            username: { $regex: new RegExp(`^${senderUsername}$`, 'i') } 
        });

        if (!user) {
            return res.status(404).json({ message: "Sender account not found." });
        }

        // 3. Password Check (Plain text "admin123")
        if (password !== user.password) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        console.log("✅ Verified. Forcing save with senderUsername...");

        // 4. THE FIX: Explicitly define every field from the Schema
        const newTransfer = new Transfer({
            fileIds: fileIds,                  // From Schema
            senderUsername: user.username || senderUsername, // THE FIX: If one is missing, use the other
            recipientId: recipientId,          // From Schema
            transferDate: new Date()           // From Schema
        });

        // 5. Use .save() instead of .create() for better error catching
        const savedLog = await newTransfer.save();

        // 6. Update File ownership
        await File.updateMany(
            { _id: { $in: fileIds } },
            { $set: { uploadedBy: recipientId } }
        );

        console.log("✅ SUCCESS: Saved to MongoDB with ID:", savedLog._id);
        return res.status(200).json({ message: "Transfer successful!" });

    } catch (err) {
        console.error("🔴 Server Error:", err.message);
        return res.status(500).json({ message: "Database Save Error", error: err.message });
    }
};