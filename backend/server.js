require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const File = require("./models/File");
const Settings = require("./models/Settings"); // Import Settings Model

const app = express();

const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, "uploads");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aaryans_file_management_system";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "https://words-wanting-law-sides.trycloudflare.com"
    ], 
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], 
    credentials: true,
  })
);

app.use("/uploads", express.static(UPLOADS_DIR));

// ROUTES
const userRoutes = require("./routes/user.routes");
const departmentRoutes = require("./routes/department.routes");
const folderRoutes = require("./routes/folder.routes");
const fileRoutes = require("./routes/file.routes"); 
const logRoutes = require("./routes/log.routes");
const transferRoutes = require("./routes/transfer.routes");
const notificationRoutes = require("./routes/notification.routes");
const requestRoutes = require("./routes/request.routes");
const backupRoutes = require('./routes/backup.route');

app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes); 
app.use("/api/logs", logRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/requests", requestRoutes);
app.use('/api/backup', backupRoutes);

// ================= DYNAMIC BACKUP SCHEDULER =================
const fileController = require("./controllers/file.controller");
let activeBackupJob = null;

const setupBackupSchedule = (interval) => {
    // Stop previous job if it exists
    if (activeBackupJob) {
        activeBackupJob.stop();
    }

    let cronExpression = '0 0 * * *'; // Default Daily
    if (interval === 'hourly') cronExpression = '0 * * * *';
    if (interval === 'weekly') cronExpression = '0 0 * * 0';

    activeBackupJob = cron.schedule(cronExpression, async () => {
        console.log(`🕒 [CRON] Running ${interval} backup...`);
        await fileController.runInternalSystemBackup();
    });

    console.log(`🚀 [CRON] Scheduler updated to: ${interval} (${cronExpression})`);
};

// API to update schedule from Frontend
app.post("/api/backup/update-schedule", async (req, res) => {
    try {
        const { interval } = req.body;
        await Settings.findOneAndUpdate(
            { key: "auto_backup_interval" },
            { value: interval },
            { upsert: true }
        );
        setupBackupSchedule(interval);
        res.json({ success: true, message: `Backup interval set to ${interval}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("❌ BACKEND CRASH DETECTED:", err.message);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message
    });
});

// DATABASE & DATA MIGRATION
const connectWithRetry = () => {
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("✅ MongoDB connected to Aaryans File Management System");
      
      // Load saved interval setting
      const savedSetting = await Settings.findOne({ key: "auto_backup_interval" });
      setupBackupSchedule(savedSetting ? savedSetting.value : 'daily');

      // Migration Logic
      try {
          const result = await File.updateMany(
            { isStarred: { $type: "bool" } }, 
            { $set: { isStarred: [] } }
          );
          if(result.modifiedCount > 0) {
              console.log(`🧹 Migration: Fixed ${result.modifiedCount} files.`);
          }
      } catch (err) {
          console.error("❌ Migration Error:", err);
      }
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

app.get("/", (req, res) => {
  res.send("🚀 Aaryans File Management System Backend is running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});