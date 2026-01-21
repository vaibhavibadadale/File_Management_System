const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

app.use("/uploads", express.static(uploadDir));

// Routes
app.use("/api/files", require("./routes/FileRoutes"));
app.use("/api/folders", require("./routes/FolderRoutes")); 
app.use("/api/users", require("./routes/UserRoutes"));

mongoose.connect("mongodb://127.0.0.1:27017/nested_upload")
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

app.listen(5000, () => console.log("🚀 Server running on port 5000"));