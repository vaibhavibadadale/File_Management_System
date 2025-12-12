// server.js
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// 🎯 Import Controllers & Routes
const FileController = require("./controllers/fileController");
const FileRoutes = require("./routes/FileRoutes");
const FolderRoutes = require("./routes/FolderRoutes");

const app = express();

// --- Configuration ---
const PORT = 5000;
const UPLOADS_DIR = path.join(__dirname, "uploads");

// ✅ Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// --- Middleware ---
app.use(express.json());

// ✅ Fix: Allow frontend to connect (CORS)
app.use(cors({
    origin: "http://localhost:3000",  // your React frontend
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true
}));

// ✅ Serve uploaded files (for file viewing)
app.use("/uploads", express.static(UPLOADS_DIR));

// --- MongoDB Connection ---
mongoose.connect("mongodb://127.0.0.1:27017/nested_upload")
    .then(() => console.log("✅ MongoDB connected successfully."))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Multer Setup (for file uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderId = req.body.folderId;
        let targetPath = UPLOADS_DIR;

        // Create subfolder if folderId is valid
        if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
            targetPath = path.join(UPLOADS_DIR, folderId.toString());
        }

        // ✅ Create target folder if not exists
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        cb(null, targetPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});
const upload = multer({ storage });

// --- API ROUTES ---

// ✅ Folder routes
app.use("/api/folders", FolderRoutes);

// ✅ File upload route (uses multer + controller)
app.post("/api/files/upload", upload.single("file"), FileController.createFileEntry);

// ✅ File routes (get, delete, etc.)
app.use("/api/files", FileRoutes);

// ✅ Default route (optional)
app.get("/", (req, res) => {
    res.send("File Management System Backend is running 🚀");
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
