import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/UploadFilePage.css"; 

// --- Define Allowed File Types for Validation ---
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    // Video
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    // Documents/Archives
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
];
const BACKEND_URL = "http://localhost:5000";

function UploadFilePage() {
    const [foldersInCurrentView, setFoldersInCurrentView] = useState([]);
    const [filesInCurrentView, setFilesInCurrentView] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [folderName, setFolderName] = useState("");
    const [currentFolderId, setCurrentFolderId] = useState(null); 
    const [currentPath, setCurrentPath] = useState([{ _id: null, name: "Home" }]); 

    // FIX: Add currentFolderId to dependency array for useEffect
    useEffect(() => {
        loadContent(currentFolderId);
    }, [currentFolderId]); // Ensure loadContent is not missing from dependencies if declared outside.

    const loadContent = async (parentId) => {
        // Load folders
        try {
            // 🛑 FIX 1: Use backticks (`) for template literals
            const folderRes = await axios.get(`${BACKEND_URL}/api/folders`, {
                params: { parentId: parentId || null },
            });
            setFoldersInCurrentView(folderRes.data.folders);
        } catch (err) {
            console.error("Error loading folders:", err);
        }

        // Load files (will be filtered by folderId)
        try {
            // 🛑 FIX 2: Use backticks (`) for template literals
            const fileRes = await axios.get(`${BACKEND_URL}/api/files`, {
                params: { folderId: parentId || null },
            });
            setFilesInCurrentView(fileRes.data.files);
        } catch (err) {
            console.error("Error loading files:", err);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            return alert("Please select a file first.");
        }
        
        // FILE TYPE VALIDATION
        if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
            alert("Unsupported file type selected. Only images, audio, video, PDF, and ZIP files are allowed.");
            setSelectedFile(null);
            document.getElementById('file-input').value = '';
            return;
        }

        if (!currentFolderId) {
            return alert("Please navigate into a folder to upload files.");
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folderId", currentFolderId); 
        formData.append("uploadedBy", "Admin");

        try {
            // 🛑 FIX 3: Use backticks (`) for template literals
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSelectedFile(null);
            document.getElementById('file-input').value = '';
            loadContent(currentFolderId); 
            // 🛑 FIX 4: Use backticks (`) for template literals in alert
            alert(`File "${selectedFile.name}" uploaded successfully!`); 
        } catch (err) {
            console.error("Error uploading file:", err);
            alert("Error uploading file: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return alert("Enter folder name");

        try {
            // 🛑 FIX 5: Use backticks (`) for template literals
            await axios.post(`${BACKEND_URL}/api/folders/create`, {
                name: folderName,
                parent: currentFolderId || null, 
                createdBy: "Admin",
            });
            setFolderName("");
            loadContent(currentFolderId); 
        } catch (err) {
            console.error("Error creating folder:", err);
            alert("Error creating folder: " + (err.response?.data?.message || err.message));
        }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolderId(folder._id);
        // Add new folder to path only if it's not already the last item
        if (currentPath[currentPath.length - 1]._id !== folder._id) {
            setCurrentPath((prevPath) => [...prevPath, { _id: folder._id, name: folder.name }]);
        }
    };

    const handlePathClick = (folderId, index) => {
        // Navigate back up the path structure
        setCurrentPath((prevPath) => prevPath.slice(0, index + 1));
        setCurrentFolderId(folderId);
    };
    
    const showUploadSection = currentFolderId !== null;

    // Function to open the file directly (using the path saved in the database)
    const handleFileClick = (file) => {
        // CRITICAL FIX: Use backticks (`) for template literals
        window.open(`${BACKEND_URL}/uploads/${file.path}`, "_blank");
    };

    return (
        <div className="page-container">
            <div className="main-content">
                
                <header className="main-header">
                    <h1>📁 File Manager</h1>
                </header>

                {/* Breadcrumb Navigation: Displays path like Home / Finance / XYZ */}
                <div className="breadcrumb">
                    {currentPath.map((item, index) => (
                        <span 
                            key={item._id || 'root'} 
                            // 🛑 FIX 6: Use backticks (`) for className string concatenation
                            className={`path-item ${item._id === currentFolderId ? 'active' : ''}`}
                            onClick={() => handlePathClick(item._id, index)}
                        >
                            {item.name}
                            {index < currentPath.length - 1 && ' / '}
                        </span>
                    ))}
                </div>
                
                {/* Upload/Creation Section */}
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
                            <button onClick={handleFileUpload} disabled={!selectedFile}>Upload File</button>
                        </>
                    )}
                </div>

                <div className="file-explorer">
                    {/* FOLDERS SECTION */}
                    <h4>📁 Folders</h4>
                    <div className="horizontal-list">
                        {foldersInCurrentView.length === 0 && <p>No sub-folders found</p>}
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

                    {/* FILES SECTION: Simple Horizontal List */}
                    {showUploadSection && (
                        <>
                            <h4>📄 Files</h4>
                            <div className="horizontal-list">
                                {filesInCurrentView.length === 0 && <p>No files found</p>}
                                {filesInCurrentView.map((file) => (
                                    <div
                                        className="file-item"
                                        key={file._id}
                                        onClick={() => handleFileClick(file)}
                                    >
                                        📄 {file.originalname}
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