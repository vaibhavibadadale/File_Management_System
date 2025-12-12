import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/UploadFilePage.css"; 

// Allowed File Types
const ALLOWED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/gif",
    "audio/mpeg", "audio/wav", "audio/ogg",
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "application/pdf", "application/zip", "application/x-zip-compressed",
];

const BACKEND_URL = "http://localhost:5000";

function UploadFilePage() {
    const [foldersInCurrentView, setFoldersInCurrentView] = useState([]);
    const [filesInCurrentView, setFilesInCurrentView] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [folderName, setFolderName] = useState("");
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [currentPath, setCurrentPath] = useState([{ _id: null, name: "Home" }]);

    // Load folders + files
    useEffect(() => {
        loadContent(currentFolderId);
    }, [currentFolderId]);

    const loadContent = async (parentId) => {
        try {
            const folderRes = await axios.get(`${BACKEND_URL}/api/folders`, {
                params: { parentId: parentId || null },
            });
            setFoldersInCurrentView(folderRes.data.folders);
        } catch (err) {
            console.error("Error loading folders:", err);
        }

        try {
            const fileRes = await axios.get(`${BACKEND_URL}/api/files`, {
                params: { folderId: parentId || null },
            });
            setFilesInCurrentView(fileRes.data.files);
        } catch (err) {
            console.error("Error loading files:", err);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return alert("Select a file first.");

        if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
            alert("Unsupported file format.");
            return;
        }

        if (!currentFolderId) return alert("Select a folder to upload files.");

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folderId", currentFolderId);
        formData.append("uploadedBy", "Admin");

        try {
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setSelectedFile(null);
            document.getElementById("file-input").value = "";
            loadContent(currentFolderId);

            alert(`File "${selectedFile.name}" uploaded successfully!`);
        } catch (err) {
            console.error("Error uploading:", err);
            alert("Upload failed: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return alert("Enter folder name");

        try {
            await axios.post(`${BACKEND_URL}/api/folders/create`, {
                name: folderName,
                parent: currentFolderId,
                createdBy: "Admin",
            });

            setFolderName("");
            loadContent(currentFolderId);
        } catch (err) {
            console.error("Error creating folder:", err);
            alert("Folder creation failed.");
        }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolderId(folder._id);
        setCurrentPath((prev) => [...prev, { _id: folder._id, name: folder.name }]);
    };

    const handlePathClick = (folderId, index) => {
        setCurrentPath((prev) => prev.slice(0, index + 1));
        setCurrentFolderId(folderId);
    };

    const showUploadSection = currentFolderId !== null;

    // const handleFileClick = (file) => {
    //     window.open(`${BACKEND_URL}/uploads/${file.path}`, "_blank");
    // };

    const handleFileClick = (file) => {
    window.open(`${BACKEND_URL}/uploads/${file.path}`);

    

};


    return (
        <div className="page-container">
            <div className="main-content">
                <header className="main-header">
                    <h1>📁 File Manager</h1>
                </header>

                {/* Breadcrumb */}
                <div className="breadcrumb">
                    {currentPath.map((item, index) => (
                        <span
                            key={item._id || "root"}
                            className={`path-item ${item._id === currentFolderId ? "active" : ""}`}
                            onClick={() => handlePathClick(item._id, index)}
                        >
                            {item.name}
                            {index < currentPath.length - 1 && " / "}
                        </span>
                    ))}
                </div>

                {/* Upload + New Folder */}
                <div className="upload-section">
                    <input
                        type="text"
                        placeholder="New folder name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                    />
                    <button onClick={handleCreateFolder}>Create Folder</button>

                    {showUploadSection && (
                        <>
                            <input
                                id="file-input"
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                            />
                            <button onClick={handleFileUpload} disabled={!selectedFile}>
                                Upload File
                            </button>
                        </>
                    )}
                </div>

                {/* File Explorer */}
                <div className="file-explorer">
                    
                    {/* FOLDERS */}
                    <h4>📁 Folders</h4>
                    <div className="horizontal-list">
                        {foldersInCurrentView.length === 0 && <p>No sub-folders</p>}
                        {foldersInCurrentView.map((folder) => (
                            <div
                                className="folder-item"
                                key={folder._id}
                                onClick={() => handleFolderClick(folder)}
                            >
                                📁 {folder.name}
                            </div>
                        ))}
                    </div>

                    {/* FILES */}
                    {showUploadSection && (
                        <>
                            <h4>📄 Files</h4>
                            <div className="horizontal-list">
                                {filesInCurrentView.length === 0 && <p>No files found</p>}

                                {filesInCurrentView.map((file) => (
                                    <div className="file-item" key={file._id}>

                                        📄 {file.originalname}

                                        {/* VIEW */}
                                        <button
                                            onClick={() =>
                                                window.open(`${BACKEND_URL}/uploads/${file.path}`, "_blank")
                                            }
                                            className="btn btn-sm btn-primary"
                                            style={{ marginLeft: "10px" }}
                                        >
                                            View
                                        </button>

                                        {/* DOWNLOAD */}
                                        <a
                                            href={`${BACKEND_URL}/api/files/download/${file._id}`}
                                            className="btn btn-sm btn-success"
                                            style={{ marginLeft: "10px" }}
                                        >
                                            Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UploadFilePage;
