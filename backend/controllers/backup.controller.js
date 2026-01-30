const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // Needed for collection access

exports.generateSystemBackup = async (req, res) => {
    try {
        // 1. Setup the backup file path
        const fileName = `system-backup-full-${Date.now()}.zip`;
        const backupsDir = path.join(__dirname, '../backups');
        const outputPath = path.join(backupsDir, fileName);
        
        // Ensure backup directory exists
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

        // --- 2. ADD COLLECTION-WISE DATABASE RECORDS ---
        // This dynamically fetches every collection in your Aaryan File Management DB
        const collections = await mongoose.connection.db.collections();
        
        for (let collection of collections) {
            const collectionName = collection.collectionName;
            const data = await collection.find({}).toArray();
            
            // Append each collection as a separate JSON file in a 'database' folder
            archive.append(JSON.stringify(data, null, 2), { 
                name: `database/${collectionName}.json` 
            });
        }

        // --- 3. ADD PHYSICAL UPLOADS ---
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