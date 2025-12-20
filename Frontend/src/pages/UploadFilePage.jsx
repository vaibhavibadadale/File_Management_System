import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/UploadFilePage.css"; 

// Ensure this import matches your file name
import TransferModal from "../components/TransferModal"; 

const DEPARTMENT_ID = "694050d65c12077b1957bc98";
const USER_ID = "694130dd872795f2641e2621"; 
const BACKEND_URL = "http://localhost:5000"; 

// --- Utility Functions ---
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

function UploadFilePage({ user }) {
    const [foldersInCurrentView, setFoldersInCurrentView] = useState([]);
    const [filesInCurrentView, setFilesInCurrentView] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [folderName, setFolderName] = useState(""); 
    const [currentFolderId, setCurrentFolderId] = useState(null); 
    const [currentPath, setCurrentPath] = useState([{ _id: null, name: "Home" }]); 
    const [filesToTransfer, setFilesToTransfer] = useState({});
    const [searchQuery, setSearchQuery] = useState(""); 
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    useEffect(() => {
        loadContent(currentFolderId);
    }, [currentFolderId]);

    const loadContent = async (parentId) => {
        setFilesToTransfer({});
        const activeFolderId = parentId || null; 

        try {
            const folderRes = await axios.get(`${BACKEND_URL}/api/folders`, {
                params: { parentId: activeFolderId, departmentId: DEPARTMENT_ID },
            });
            setFoldersInCurrentView(folderRes.data.folders || []);
        } catch (err) { console.error("Error loading folders:", err); }

        try {
            const fileRes = await axios.get(`${BACKEND_URL}/api/files`, {
                params: { folderId: activeFolderId }, 
            });
            setFilesInCurrentView(fileRes.data.files || []);
        } catch (err) { console.error("Error loading files:", err); }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return alert("Please select a file first.");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folderId", currentFolderId || "null");
        formData.append("uploadedBy", USER_ID);
        formData.append("departmentId", DEPARTMENT_ID);

        try {
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData);
            setSelectedFile(null);
            document.getElementById('file-input').value = '';
            loadContent(currentFolderId); 
            alert("Uploaded!");
        } catch (err) { console.error("Upload error", err); }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return alert("Enter folder name");
        try {
            await axios.post(`${BACKEND_URL}/api/folders/create`, {
                name: folderName, parent: currentFolderId, createdBy: USER_ID, departmentId: DEPARTMENT_ID,
            });
            setFolderName("");
            loadContent(currentFolderId);
        } catch (err) { console.error(err); }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolderId(folder._id);
        setCurrentPath((prev) => [...prev, { _id: folder._id, name: folder.folderName }]);
    };

    const handlePathClick = (item) => {
        const index = currentPath.findIndex(p => p._id === item._id);
        if (index !== -1) {
            setCurrentPath((prev) => prev.slice(0, index + 1));
            setCurrentFolderId(item._id);
        }
    };

    const handleFileSelect = (id) => {
        setFilesToTransfer(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const newSelection = {};
            itemsInCurrentView.forEach(item => newSelection[item._id] = true);
            setFilesToTransfer(newSelection);
        } else {
            setFilesToTransfer({});
        }
    };

    const handleTransferFiles = () => {
        const selectedIds = Object.keys(filesToTransfer).filter(id => filesToTransfer[id]);
        if (selectedIds.length === 0) return;
        setIsTransferModalOpen(true);
    };

    let itemsInCurrentView = [
        ...foldersInCurrentView.map(f => ({...f, type: 'Folder', name: f.folderName, originalname: f.folderName})),
        ...filesInCurrentView.map(f => ({...f, type: f.mimetype || 'application/octet-stream', originalname: f.originalname}))
    ];

    const showTransferButton = Object.values(filesToTransfer).filter(Boolean).length > 0;
    const isAllSelected = itemsInCurrentView.length > 0 && itemsInCurrentView.every(item => filesToTransfer[item._id]);

    return (
        <div className="file-explorer-app-single-pane">
            <main className="main-content">
                <header className="main-header"><h1>📁 File Manager</h1></header>
                
                <div className="main-actions-toolbar">
                    <div className="action-group create-group">
                        <input type="text" placeholder="New folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} className="create-input" />
                        <button onClick={handleCreateFolder} className="create-btn"><i className="fas fa-plus"></i> Create Folder</button>
                    </div>

                    {currentFolderId !== null && (
                        <div className="action-group upload-group">
                            <label className="upload-label-main" htmlFor="file-input"><i className="fas fa-upload"></i> Upload</label>
                            <input id="file-input" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} hidden />
                            <button onClick={handleFileUpload} disabled={!selectedFile} className="upload-btn-main">Upload</button>
                        </div>
                    )}

                    <div className="action-group search-group">
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                    </div>
                </div>

                <div className="breadcrumb">
                    {currentPath.map((item, index) => (
                        <span key={item._id || index} className="path-item" onClick={() => handlePathClick(item)}>
                            {item.name} {index < currentPath.length - 1 && ' / '}
                        </span>
                    ))}
                </div>

                <div className="list-toolbar">
                    <h2>Content</h2>
                    <button onClick={handleTransferFiles} disabled={!showTransferButton} className="transfer-btn">
                        <i className="fas fa-share-square"></i> 
                        {showTransferButton ? ` Transfer Selected (${Object.values(filesToTransfer).filter(Boolean).length})` : ' Transfer Selected'}
                    </button>
                </div>

                <div className="file-table-container">
                    <table className="file-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} /></th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsInCurrentView.map((item) => (
                                <tr key={item._id} onDoubleClick={item.type === 'Folder' ? () => handleFolderClick(item) : null}>
                                    <td><input type="checkbox" checked={!!filesToTransfer[item._id]} onChange={() => handleFileSelect(item._id)} /></td>
                                    <td>
                                        <i className={`${item.type === 'Folder' ? 'fas fa-folder' : getFileIcon(item.type)} file-icon`}></i>
                                        {item.originalname}
                                    </td>
                                    <td>{item.type}</td>
                                    <td>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                                    <td>{item.type === 'Folder' ? '—' : formatBytes(item.size)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Modal Integration - Using a fallback for senderUsername */}
            {isTransferModalOpen && (
    <TransferModal 
        selectedIds={Object.keys(filesToTransfer).filter(id => filesToTransfer[id])}
        // Force "Admin" if user name is missing to test the database save
        senderUsername={user?.name || "Admin"} 
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => { 
            setFilesToTransfer({}); 
            setIsTransferModalOpen(false); 
            loadContent(currentFolderId); 
        }}
    />
)}
        </div>
    );
}

export default UploadFilePage;