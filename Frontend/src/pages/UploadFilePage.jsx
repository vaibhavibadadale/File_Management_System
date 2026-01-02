import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // 1. Import useNavigate
import "../styles/UploadFilePage.css"; 
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

const formatMimeType = (mime) => {
    if (!mime || mime === 'application/octet-stream') return 'File';
    if (mime.includes('/')) return mime.split('/')[1].toUpperCase();
    return mime;
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
    const navigate = useNavigate(); // 2. Initialize navigate
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
        formData.append("username", user?.username || "Admin"); 
        formData.append("folderId", currentFolderId || "null");
        formData.append("uploadedBy", USER_ID);
        formData.append("departmentId", DEPARTMENT_ID);
        formData.append("file", selectedFile);

        try {
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData);
            setSelectedFile(null);
            if(document.getElementById('file-input')) {
                document.getElementById('file-input').value = '';
            }
            loadContent(currentFolderId); 
            alert(`Uploaded successfully!`);
        } catch (err) { 
            console.error("Upload error", err); 
            alert("Upload failed.");
        }
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

    const handleGoBack = () => {
        if (currentPath.length > 1) {
            const newPath = [...currentPath];
            newPath.pop(); 
            const parentFolder = newPath[newPath.length - 1];
            setCurrentPath(newPath);
            setCurrentFolderId(parentFolder._id);
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

    let itemsInCurrentView = [];
    if (currentFolderId === null) {
        itemsInCurrentView = foldersInCurrentView.map(f => ({
            ...f, type: 'Folder', name: f.folderName, originalname: f.folderName
        }));
    } else {
        itemsInCurrentView = [
            ...foldersInCurrentView.map(f => ({...f, type: 'Folder', name: f.folderName, originalname: f.folderName})),
            ...filesInCurrentView.map(f => ({
                ...f, 
                type: f.mimetype || 'File', 
                displayName: f.originalname || f.originalName || "Unnamed File" 
            }))
        ];
    }

    if (searchQuery) {
        itemsInCurrentView = itemsInCurrentView.filter(item => 
            (item.displayName || item.originalname).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    const showTransferButton = Object.values(filesToTransfer).filter(Boolean).length > 0;
    const isAllSelected = itemsInCurrentView.length > 0 && itemsInCurrentView.every(item => filesToTransfer[item._id]);

    return (
        <div className="file-explorer-app-single-pane">
            <main className="main-content">
                <header className="main-header mb-4">
                    <div className="d-flex align-items-center">
                        <h1 className="mb-0">📁 File Manager</h1>
                        <span className="badge bg-info ms-3 text-uppercase">
                            {user?.department || ""}
                        </span>
                    </div>
                </header>
                
                <div className="main-actions-toolbar">
                    <div className="action-group create-group d-flex align-items-center">
                        <button 
                            className="btn btn-outline-secondary me-2" 
                            onClick={handleGoBack}
                            disabled={currentFolderId === null}
                            title="Go Back"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>

                        <input 
                            type="text" 
                            placeholder="New folder name" 
                            value={folderName} 
                            onChange={(e) => setFolderName(e.target.value)} 
                            className="create-input" 
                        />
                        <button onClick={handleCreateFolder} className="create-btn">
                            <i className="fas fa-plus"></i> Create Folder
                        </button>
                    </div>

                    {currentFolderId !== null && (
                        <div className="action-group upload-group">
                            <label className="upload-label-main" htmlFor="file-input">
                                <i className="fas fa-upload"></i> Upload
                            </label>
                            <input id="file-input" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} hidden />
                            <button onClick={handleFileUpload} disabled={!selectedFile} className="upload-btn-main">
                                Upload
                            </button>
                        </div>
                    )}

                    <div className="action-group search-group">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="search-input" 
                        />
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
                            {itemsInCurrentView.length > 0 ? itemsInCurrentView.map((item) => (
                                <tr 
                                    key={item._id} 
                                    onDoubleClick={item.type === 'Folder' ? () => handleFolderClick(item) : null}
                                >
                                    <td><input type="checkbox" checked={!!filesToTransfer[item._id]} onChange={() => handleFileSelect(item._id)} /></td>
                                    <td>
                                        <i className={`${item.type === 'Folder' ? 'fas fa-folder text-warning' : getFileIcon(item.type)} file-icon me-2`}></i>
                                        {item.type === 'Folder' ? item.originalname : item.displayName}
                                    </td>
                                    <td>{formatMimeType(item.type)}</td>
                                    <td>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                                    <td>{item.type === 'Folder' ? '—' : formatBytes(item.size)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        Empty
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {isTransferModalOpen && (
                <TransferModal 
                    selectedIds={Object.keys(filesToTransfer).filter(id => filesToTransfer[id])}
                    senderUsername={user?.username || "Admin"} 
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