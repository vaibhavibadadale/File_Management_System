require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, "uploads");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aaryans_file_management_system";

// ================= ENSURE UPLOADS DIR =================
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], 
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], 
    credentials: true,
  })
);

// ================= STATIC FILES =================
app.use("/uploads", express.static(UPLOADS_DIR));

// ================= ROUTES =================
const userRoutes = require("./routes/user.routes");
const departmentRoutes = require("./routes/department.routes");
const folderRoutes = require("./routes/folder.routes");
const fileRoutes = require("./routes/file.routes");
const logRoutes = require("./routes/log.routes");
const transferRoutes = require("./routes/transfer.routes");
const notificationRoutes = require("./routes/notification.routes");
const requestRoutes = require("./routes/request.routes");

app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/requests", requestRoutes); // Points to routes/request.routes.js

// ================= GLOBAL ERROR HANDLER (ADD THIS HERE) =================
app.use((err, req, res, next) => {
    console.error("❌ BACKEND CRASH DETECTED:");
    console.error("Path:", req.path);
    console.error("Method:", req.method);
    
    // This will print the exact file and line number in your VS Code terminal
    console.error(err.stack); 

    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
        // Optional: show stack trace only in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
});

// ================= DATABASE =================
const connectWithRetry = () => {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected to Aaryans File Management System"))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      console.log("🔁 Retrying MongoDB connection in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 Aaryans File Management System Backend is running");
});

// ================= 404 HANDLER =================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});