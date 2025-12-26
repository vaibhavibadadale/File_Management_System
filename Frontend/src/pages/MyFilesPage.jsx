import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./MyFilesPage.css"; // we'll add this next for styling

function MyFilesPage({ username }) {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(username); // starts in user's root folder
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Load folders when user logs in or path changes
  useEffect(() => {
    fetchFolders();
  }, [currentPath]);

  // Fetch folders from backend
  const fetchFolders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/folders/all");
      const userFolders = res.data.filter((f) => f.createdBy === username);
      setFolders(userFolders);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };

  // Create a new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return toast.error("Enter a folder name!");

    try {
      await axios.post("http://localhost:5000/api/folders/create", {
        name: newFolderName,
        createdBy: username,
      });
      toast.success("Folder created successfully!");
      setNewFolderName("");
      fetchFolders();
    } catch (err) {
      toast.error("Failed to create folder");
      console.error(err);
    }
  };

  // Upload a file
  const handleUpload = async () => {
    if (!selectedFile) return toast.error("Select a file first!");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("uploadedBy", username);
    formData.append("path", currentPath);

    try {
      const res = await axios.post("http://localhost:5000/api/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message || "File uploaded successfully!");
      setSelectedFile(null);
      fetchFolders();
    } catch (err) {
      toast.error("File upload failed!");
      console.error(err);
    }
  };

  return (
    <div className="file-explorer-container">
      <h2>📁 My Files — {username}</h2>

      {/* Toolbar */}
      <div className="file-toolbar">
        <div className="folder-controls">
          <input
            type="text"
            placeholder="Enter folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button onClick={handleCreateFolder}>Create Folder</button>
        </div>

        <div className="upload-controls">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          <button onClick={handleUpload}>Upload File</button>
        </div>
      </div>

      {/* File Explorer Grid */}
      <div className="file-grid">
        {folders.map((folder) => (
          <div
            key={folder._id}
            className="file-card folder"
            onClick={() => setCurrentPath(folder.path)}
          >
            📁 {folder.name}
          </div>
        ))}

        {files.map((file) => (
          <div key={file._id} className="file-card file">
            📄 {file.originalname}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyFilesPage;
