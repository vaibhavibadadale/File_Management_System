require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
// 1. Correct import
const requestRoutes = require('./routes/request.routes'); 

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, "uploads");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aaryans_file_managementDB";

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
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/departments", require("./routes/department.routes"));
app.use("/api/folders", require("./routes/folder.routes"));
app.use("/api/files", require("./routes/file.routes"));
app.use("/api/logs", require("./routes/log.routes"));
app.use("/api/transfer", require("./routes/transfer.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));

// 2. ADD THIS LINE HERE:
app.use("/api/requests", requestRoutes); 

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