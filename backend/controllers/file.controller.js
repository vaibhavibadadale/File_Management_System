const File = require("../models/File");
const Folder = require("../models/Folder");
const Log = require("../models/Log");
const path = require("path");
const fs = require("fs");

// 1. UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const { folderId, userId, departmentId, username } = req.body;

        // Clean IDs: Ensure we don't send empty strings or the literal string "null"
        const cleanFolderId = (!folderId || folderId === "null" || folderId === "undefined") ? null : folderId;
        
        // CRITICAL: If your model requires departmentId, it must be a valid 24-char ObjectId hex string.
        // If an admin (a- or s-) doesn't have a department, it MUST be null.
        const cleanDeptId = (!departmentId || departmentId === "null" || departmentId === "undefined" || departmentId === "") ? null : departmentId;

        const newFile = new File({
            originalName: req.file.originalname,
            filename: req.file.filename, 
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            username: username || "Admin",
            folder: cleanFolderId,
            uploadedBy: userId,
            departmentId: cleanDeptId,
            transferStatus: 'none',
            isStarred: [],
            viewedBy: []
        });

        await newFile.save();
        res.status(201).json({ success: true, file: newFile });

    } catch (error) {
        // If it still fails, this log will tell us exactly why (e.g., Cast to ObjectId failed)
        console.error("❌ File Upload DB Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", currentFolderId || "null");
    formData.append("userId", currentUserId);
    formData.append("username", user.username); // CRITICAL for your a-/s- logic
    
    // Ensure departmentId is a valid hex string or don't append if null
    if (userDeptId) {
        formData.append("departmentId", userDeptId);
    }

    try {
        await axios.post(`${BACKEND_URL}/api/files/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        await loadContent(currentFolderId);
    } catch (err) {
        console.error("Upload Error:", err.response?.data || err.message);
    }
};

// 2. GET FILES
exports.getFilesByFolder = async (req, res) => {
    try {
        const { folderId, userId, all, isStarred, role, departmentId } = req.query; 
        
        if (!userId || userId === "null" || userId === "undefined") {
            return res.status(400).json({ success: false, message: "User context missing." });
        }

        let query = { deletedAt: null };
        const userRole = (role || "").toLowerCase();
        const isAdminOrHOD = ["admin", "superadmin", "hod"].includes(userRole);

        if (isStarred === "true") {
            query.isStarred = { $in: [userId] }; 
        } else if (isAdminOrHOD) {
            if (departmentId) query.departmentId = departmentId;
            if (all !== "true") {
                query.folder = (!folderId || folderId === "null") ? null : folderId;
            }
        } else {
            // FIX: Added senderId so the person who sent the file can still see it
            query.$or = [
                { uploadedBy: userId }, 
                { sharedWith: userId }, 
                { senderId: userId } 
            ];
            
            if (all !== "true") {
                query.folder = (!folderId || folderId === "null") ? null : folderId;
            }
        }

        const files = await File.find(query)
            .populate("uploadedBy", "name username")
            .sort({ createdAt: -1 });

        return res.json({ files, success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message, success: false });
    }
};

// 3. TRACK VIEW
exports.trackView = async (req, res) => {
    try {
        const { fileId, userId } = req.body;
        if (!fileId) return res.status(400).json({ success: false, message: "File ID required" });

        const updateData = { $set: { lastViewedAt: new Date() } };
        if (userId) updateData.$addToSet = { viewedBy: userId };

        const updatedFile = await File.findByIdAndUpdate(fileId, updateData, { new: true });
        if (!updatedFile) return res.status(404).json({ success: false, message: "File not found" });

        res.status(200).json({ success: true, lastViewedAt: updatedFile.lastViewedAt });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. TOGGLE STAR
exports.toggleFileStar = async (req, res) => {
    try {
        const { id } = req.params; 
        const { userId, isStarred } = req.body;
        const file = await File.findById(id);
        if (!file) return res.status(404).json({ message: "File not found" });

        const update = isStarred 
            ? { $addToSet: { isStarred: userId } } 
            : { $pull: { isStarred: userId } };

        const updatedFile = await File.findByIdAndUpdate(id, update, { new: true });
        res.json({ 
            success: true, 
            count: updatedFile.isStarred.length,
            isStarred: updatedFile.isStarred.includes(userId)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 5. SOFT DELETE
exports.softDeleteFile = async (req, res) => {
    try {
        const { userId } = req.body;
        const file = await File.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
        if (file) {
            await Log.create({
                userId: userId,
                action: "FILE_DELETED",
                fileId: req.params.id,
                details: `Deleted file: ${file.originalName}`
            });
        }
        res.json({ message: "File deleted successfully", success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};

// 6. TOGGLE STATUS (FIXED)
exports.toggleFileStatus = async (req, res) => {
    console.log("--- REQUEST RECEIVED: Toggle Status ---");
    try {
        const { id } = req.params;
        const { isDisabled, adminId } = req.body;

        const updatedFile = await File.findByIdAndUpdate(
            id, 
            { isDisabled: isDisabled }, 
            { new: true }
        );

        if (!updatedFile) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const logUserId = adminId && adminId !== "null" ? adminId : updatedFile.uploadedBy;

        await Log.create({
            userId: logUserId,
            action: isDisabled ? "FILE_DISABLED" : "FILE_ENABLED",
            fileId: id,
            details: `${isDisabled ? 'Disabled' : 'Enabled'} file: ${updatedFile.originalName}`
        });

        console.log(`✅ Status updated for ${updatedFile.originalName}: ${isDisabled}`);
        return res.json({ success: true, message: "Status updated", file: updatedFile });
    } catch (error) {
        console.error("❌ Toggle Status Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 7. BACKUP
exports.runInternalSystemBackup = async () => {
    try {
        const backupDir = path.join(__dirname, "../backups");
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const data = {
            files: await File.find({}),
            folders: await Folder.find({}),
            logs: await Log.find({})
        };

        const fileName = `auto-backup-${Date.now()}.json`;
        fs.writeFileSync(path.join(backupDir, fileName), JSON.stringify({ metadata: { generatedAt: new Date() }, data }, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};