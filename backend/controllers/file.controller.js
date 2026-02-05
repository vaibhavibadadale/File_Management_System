const File = require("../models/File");
const Folder = require("../models/Folder");
const Log = require("../models/Log");
const path = require("path");
const fs = require("fs");

// 1. UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        const { folderId, uploadedBy, departmentId, username } = req.body;
        const targetUserFolder = username || "Admin";
        const targetFolderId = (!folderId || folderId === "null") ? null : folderId;

        let nestedPath = "";
        if (targetFolderId) {
            const folderDoc = await Folder.findById(targetFolderId);
            if (folderDoc && folderDoc.path) {
                nestedPath = folderDoc.path.endsWith('/') ? folderDoc.path : `${folderDoc.path}/`;
            }
        }

        const finalDbPath = `/uploads/${targetUserFolder}/${nestedPath}${req.file.filename}`;

        const newFile = await File.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            folder: targetFolderId,
            uploadedBy: uploadedBy,
            username: targetUserFolder,
            departmentId: departmentId,
            size: req.file.size,
            mimeType: req.file.mimetype,
            path: finalDbPath 
        });

        await Log.create({
            userId: uploadedBy,
            action: "FILE_UPLOADED",
            fileId: newFile._id,
            details: `Uploaded ${req.file.originalname} to ${targetUserFolder}'s folder`
        });

        res.status(201).json({ message: "File Saved", file: newFile, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
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
            query.$or = [{ uploadedBy: userId }, { sharedWith: userId }];
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