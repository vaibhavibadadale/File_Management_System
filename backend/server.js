import 'dotenv/config';
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Helper to define __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Routes (Notice the .js extension - REQUIRED in ES Modules)
import userRoutes from "./routes/user.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import folderRoutes from "./routes/folder.routes.js";
import fileRoutes from "./routes/file.routes.js";
import logRoutes from "./routes/log.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import requestRoutes from './routes/request.routes.js';

const app = express();

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
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/notifications", notificationRoutes);
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