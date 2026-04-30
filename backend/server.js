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
// Prioritize the .env variable; only use hardcoded for local fallback if absolutely necessary
const MONGO_URI = process.env.MONGO_URI;

// ================= ENSURE UPLOADS DIR =================
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ================= MIDDLEWARE =================
app.use(cors({
  origin: [
    
    "https://filemanagement-five.vercel.app","http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC FILES =================
app.use("/uploads", express.static(UPLOADS_DIR));

// ================= ROUTES =================
// Note: Ensure these files actually exist in your /routes folder
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
app.use("/api/requests", requestRoutes);

// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 Aaryans File Management System Backend is running");
});

// ================= DATABASE CONNECTION =================
const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is missing from environment variables.");
    }
    
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Atlas connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.log("🔁 Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// ================= ERROR HANDLING =================
// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});