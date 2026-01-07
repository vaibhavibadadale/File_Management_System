router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { folderId, uploadedBy } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const folder = folderId ? await Folder.findById(folderId) : null;

    const newFile = await File.create({
      filename: req.file.filename,
      originalname: req.file.originalname,
      uploadedBy,
      folder: folder ? folder._id : null,
      path: folder ? `${folder.path}${req.file.originalname}` : `/uploads/${req.file.originalname}`,
    });

    res.status(201).json({ message: "✅ File uploaded", file: newFile });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Server error while uploading file", error: err.message });
  }
});