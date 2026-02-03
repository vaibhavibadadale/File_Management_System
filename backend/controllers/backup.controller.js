const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Helper to calculate folder size
const getDirSize = (dirPath) => {
    let size = 0;
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (let i = 0; i < files.length; i++) {
            const filePath = path.join(dirPath, files[i]);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) size += stats.size;
            else if (stats.isDirectory()) size += getDirSize(filePath);
        }
    }
    return size;
};

// NEW: Fixes 404 for /api/files/storage-stats
exports.getSystemStats = async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        const uploadSize = getDirSize(uploadsDir);
        const stats = await mongoose.connection.db.stats();
        const totalSize = uploadSize + stats.dataSize;
        res.json({ totalSize });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// NEW: Fixes 404 for /api/files/system-backup-check
exports.getBackupCheck = async (req, res) => {
    try {
        const stats = await mongoose.connection.db.stats();
        const uploadsDir = path.join(__dirname, '../uploads');
        const uploadSize = getDirSize(uploadsDir);
        // Estimate size with 5% compression margin
        const backupSize = (uploadSize + stats.dataSize) * 0.95;
        res.json({ backupSize });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// EXISTING: Your original backup logic
exports.generateSystemBackup = async (req, res) => {
    try {
        const fileName = `system-backup-full-${Date.now()}.zip`;
        const backupsDir = path.join(__dirname, '../backups');
        const outputPath = path.join(backupsDir, fileName);
        
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(outputPath, (err) => {
                if (err) console.error("Download Error:", err);
            });
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);

        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            const collectionName = collection.collectionName;
            const data = await collection.find({}).toArray();
            archive.append(JSON.stringify(data, null, 2), { 
                name: `database/${collectionName}.json` 
            });
        }

        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            archive.directory(uploadsDir, 'user_files');
        }

        await archive.finalize();
    } catch (err) {
        console.error("Backup Logic Error:", err);
        res.status(500).json({ success: false, message: "Backup failed: " + err.message });
    }
};