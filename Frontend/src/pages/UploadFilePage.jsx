// src/pages/UploadFilePage.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/UploadFilePage.css"; 


// --- Configuration and Utility Functions ---
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
];
// Ensure this URL is correct for your backend server
const BACKEND_URL = "http://localhost:5000"; 

const getFileIcon = (mimeType) => {
    if (!mimeType || typeof mimeType !== 'string') return 'fas fa-file'; 
    
    if (mimeType.includes('image')) return 'fas fa-file-image';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fas fa-file-excel';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'fas fa-file-archive';
    if (mimeType.includes('audio')) return 'fas fa-file-audio';
    if (mimeType.includes('video')) return 'fas fa-file-video';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    
    return 'fas fa-file';
};

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0 || bytes === null || bytes === undefined) return '—';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


function UploadFilePage() {
    const [foldersInCurrentView, setFoldersInCurrentView] = useState([]);
    const [filesInCurrentView, setFilesInCurrentView] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [folderName, setFolderName] = useState(""); 
    const [currentFolderId, setCurrentFolderId] = useState(null); 
    const [currentPath, setCurrentPath] = useState([{ _id: null, name: "Home" }]); 
    const [filesToTransfer, setFilesToTransfer] = useState({});
    const [searchQuery, setSearchQuery] = useState(""); 

    useEffect(() => {
        loadContent(currentFolderId);
    }, [currentFolderId]);

    const loadContent = async (parentId) => {
        setFilesToTransfer({});

        // Load folders
        try {
            const folderRes = await axios.get(`${BACKEND_URL}/api/folders`, {
                params: { parentId: parentId || null },
            });
            setFoldersInCurrentView(folderRes.data.folders);
        } catch (err) {
            console.error("Error loading folders:", err);
            setFoldersInCurrentView([]);
        }

        // Load files 
        try {
            const fileRes = await axios.get(`${BACKEND_URL}/api/files`, {
                params: { folderId: parentId || null },
            });
            setFilesInCurrentView(fileRes.data.files);
        } catch (err) {
            console.error("Error loading files:", err);
            setFilesInCurrentView([]);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return alert("Please select a file first.");
        
        if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
            alert("Unsupported file type selected. Please check allowed types.");
            setSelectedFile(null);
            document.getElementById('file-input').value = '';
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folderId", currentFolderId || null); 
        formData.append("uploadedBy", "Admin"); 

        try {
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            
            setSelectedFile(null);
            document.getElementById('file-input').value = '';
            
            // CRITICAL: Reload content to fetch the new file list
            loadContent(currentFolderId); 
            
            alert(`File "${selectedFile.name}" uploaded successfully!`); 
        } catch (err) {
            console.error("Error uploading file:", err);
            alert("Error uploading file: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return alert("Enter folder name");

        try {
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
        setCurrentPath((prevPath) => [...prevPath, { _id: folder._id, name: folder.name }]);
        setSearchQuery(""); 
    };

    const handlePathClick = (item) => {
        const folderId = item._id;
        const index = currentPath.findIndex(p => p._id === folderId);
        
        if (index !== -1) {
            setCurrentPath((prevPath) => prevPath.slice(0, index + 1));
            setCurrentFolderId(folderId);
            setSearchQuery(""); 
        }
    };
    
    const handleFileClick = (file) => {
        // This is the function that initiates file viewing/download
        window.open(`${BACKEND_URL}/uploads/${file.path}`, "_blank");
    };

    const handleFileSelect = (fileId) => {
        setFilesToTransfer((prev) => {
            const newState = { ...prev };
            if (newState[fileId]) { delete newState[fileId]; } else { newState[fileId] = true; }
            return newState;
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allItemIds = itemsInCurrentView.map(item => item._id);
            const newSelection = {};
            allItemIds.forEach(id => newSelection[id] = true);
            setFilesToTransfer(newSelection);
        } else {
            setFilesToTransfer({});
        }
    };

    const handleTransferFiles = () => {
        const selectedIds = Object.keys(filesToTransfer);
        if (selectedIds.length === 0) return;
        alert(`Initiating transfer for ${selectedIds.length} files. \nIDs: ${selectedIds.join(', ')}\n\n(Next step: Implement destination selection logic)`);
    };

    // --- Data Aggregation and Sorting (FIXED LOGIC) ---
    let itemsInCurrentView = [];
    const lowerCaseQuery = searchQuery.toLowerCase();
    const isRootFolder = currentFolderId === null;

    if (searchQuery) {
        // SCENARIO 1: SEARCH IS ACTIVE - Show files and folders matching the query
        let allItems = [
            ...foldersInCurrentView.map(f => ({...f, type: 'Folder', name: f.name, originalname: f.name})),
            ...filesInCurrentView.map(f => ({...f, type: f.mimetype || 'application/octet-stream', originalname: f.originalname}))
        ];
        
        itemsInCurrentView = allItems.filter(item => 
            (item.originalname || item.name).toLowerCase().includes(lowerCaseQuery)
        );
        
    } else {
        // SCENARIO 2: NO SEARCH QUERY
        
        if (!isRootFolder) {
            // FIX: If we are inside a sub-folder, show both files and folders.
            itemsInCurrentView = [
                ...foldersInCurrentView.map(f => ({...f, type: 'Folder', name: f.name, originalname: f.name})),
                ...filesInCurrentView.map(f => ({...f, type: f.mimetype || 'application/octet-stream', originalname: f.originalname}))
            ];
        } else {
            // If we are in the root 'Home' folder, only show folders.
            itemsInCurrentView = foldersInCurrentView.map(f => ({
                ...f, 
                type: 'Folder', 
                name: f.name, 
                originalname: f.name
            }));
        }
    }
    
    // Final Sorting: Folders first, then files by name
    itemsInCurrentView.sort((a, b) => {
        if (a.type === 'Folder' && b.type !== 'Folder') return -1;
        if (a.type !== 'Folder' && b.type === 'Folder') return 1;
        
        const nameA = a.originalname || a.name || '';
        const nameB = b.originalname || b.name || '';
        return nameA.localeCompare(nameB);
    });

    
    const showTransferButton = Object.keys(filesToTransfer).length > 0;
    const item_count = itemsInCurrentView.length;
    const isAllSelected = item_count > 0 && itemsInCurrentView.every(item => filesToTransfer[item._id]);

    const createGroupClassName = `action-group create-group ${currentFolderId !== null ? 'has-right-border' : ''}`;


    return (
        <div className="file-explorer-app-single-pane">
            
            <main className="main-content">
                <header className="main-header">
                    <h1>📁 File Manager</h1>
                </header>
                
                {/* ACTIONS TOOLBAR AND SEARCH BAR */}
                <div className="main-actions-toolbar">
                    
                    {/* 1. Create Folder */}
                    <div className={createGroupClassName}>
                        <input
                            type="text"
                            placeholder="New folder name"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            className="create-input"
                        />
                        <button onClick={handleCreateFolder} title="Create New Folder" className="create-btn">
                            <i className="fas fa-plus"></i> Create Folder
                        </button>
                    </div>

                    {/* 2. Upload File (CONDITIONAL: Only visible when inside a folder) */}
                    {currentFolderId !== null && (
                        <div className="action-group upload-group">
                            <label className="upload-label-main" htmlFor="file-input">
                                <i className="fas fa-upload"></i> Upload File
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                hidden 
                            />
                            {selectedFile && <span className="selected-file-name">{selectedFile.name}</span>}
                            <button onClick={handleFileUpload} disabled={!selectedFile} className="upload-btn-main">
                                Upload
                            </button>
                        </div>
                    )}
                    
                    {/* 3. Search Bar */}
                    <div className="action-group search-group">
                        <i className="fas fa-search search-icon"></i>
                        <input
                            type="text"
                            placeholder="Search files and folders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Breadcrumb Navigation */}
                <div className="breadcrumb">
                    {currentPath.map((item, index) => (
                        <span 
                            key={item._id || 'root'} 
                            className={`path-item ${item._id === currentFolderId ? 'active' : ''}`}
                            onClick={() => handlePathClick(item)}
                        >
                            {item.name}
                            {index < currentPath.length - 1 && ' / '}
                        </span>
                    ))}
                </div>

                {/* List Header and Transfer Button */}
                <div className="list-toolbar">
                    <h2>
                        {searchQuery 
                            ? `Search Results in: ${currentPath[currentPath.length - 1].name}` 
                            : `Current Folder: ${currentPath[currentPath.length - 1].name}`
                        }
                    </h2>
                    <button 
                        onClick={handleTransferFiles} 
                        disabled={!showTransferButton} 
                        className="transfer-btn"
                    >
                        <i className="fas fa-share-square"></i> 
                        {showTransferButton ? `Transfer Selected (${Object.keys(filesToTransfer).length})` : 'Transfer Selected'}
                    </button>
                </div>

                {/* File/Folder Horizontal Table View */}
                <div className="file-table-container">
                    <table className="file-table">
                        <thead>
                            <tr>
                                <th style={{width: '30px'}}>
                                    {item_count > 0 && (
                                        <input 
                                            type="checkbox" 
                                            onChange={handleSelectAll} 
                                            checked={isAllSelected}
                                        />
                                    )}
                                </th>
                                <th style={{width: '40%'}}>Name</th>
                                <th style={{width: '20%'}}>Type</th>
                                <th style={{width: '20%'}}>Date Modified</th>
                                <th style={{width: '10%'}}>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsInCurrentView.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="empty-message">
                                        {searchQuery 
                                            ? `No items match "${searchQuery}" in this folder.` 
                                            : `This folder contains no ${isRootFolder ? 'sub-folders' : 'folders or files'}.`
                                        }
                                    </td>
                                </tr>
                            )}
                            {itemsInCurrentView.map((item) => (
                                <tr key={item._id || item.name} 
                                    className={item.type === 'Folder' ? 'folder-row' : 'file-row'}
                                    onDoubleClick={item.type === 'Folder' ? () => handleFolderClick(item) : () => handleFileClick(item)}
                                >
                                    <td>
                                        <input 
                                            type="checkbox" 
                                            checked={!!filesToTransfer[item._id]} 
                                            onChange={() => handleFileSelect(item._id)}
                                            onClick={(e) => e.stopPropagation()} 
                                        />
                                    </td>
                                    <td>
                                        <i className={`${item.type === 'Folder' ? 'fas fa-folder' : getFileIcon(item.type)} file-icon`}></i>
                                        {item.originalname}
                                    </td>
                                    <td>{item.type === 'Folder' ? 'Folder' : item.type.split('/').pop()?.toUpperCase() || 'N/A'}</td>
                                    <td>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                                    <td>{item.type === 'Folder' ? '—' : formatBytes(item.size)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

export default UploadFilePage;