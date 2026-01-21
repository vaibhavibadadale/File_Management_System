import React, { useState, useEffect } from "react";
import axios from "axios";
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
    if (bytes === 0 || !bytes) return '—';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

function UploadFilePage({ user, viewMode, currentTheme }) {
    const [foldersInCurrentView, setFoldersInCurrentView] = useState([]);
    const [filesInCurrentView, setFilesInCurrentView] = useState([]);
    const [receivedItems, setReceivedItems] = useState([]);
    const [isReceivedModalOpen, setIsReceivedModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [folderName, setFolderName] = useState(""); 
    const [currentFolderId, setCurrentFolderId] = useState(null); 
    const [currentPath, setCurrentPath] = useState([{ _id: null, name: "Home" }]); 
    const [itemsToTransfer, setItemsToTransfer] = useState({});
    const [searchQuery, setSearchQuery] = useState(""); 
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [starredItems, setStarredItems] = useState({});

    const isDark = currentTheme === "dark";

    useEffect(() => {
        loadContent(currentFolderId);
    }, [currentFolderId, user?._id, viewMode]);

    const loadContent = async (parentId) => {
        setItemsToTransfer({});
        const activeFolderId = parentId || "null"; 
        const currentUserId = user?._id || USER_ID;

        let params = { userId: currentUserId };
        
        if (viewMode === "important") {
            params.isStarred = true;
        } else {
            params.parentId = activeFolderId;
            params.folderId = activeFolderId;
            params.departmentId = user?.departmentId || DEPARTMENT_ID;
        }

        try {
            const folderRes = await axios.get(`${BACKEND_URL}/api/folders`, { params });
            setFoldersInCurrentView(folderRes.data.folders || []);

            const fileRes = await axios.get(`${BACKEND_URL}/api/files`, { params });
            setFilesInCurrentView(fileRes.data.files || []);

            const stars = {};
            [...(folderRes.data.folders || []), ...(fileRes.data.files || [])].forEach(item => {
                if (item.isStarred) stars[item._id] = true;
            });
            setStarredItems(stars);
        } catch (err) { console.error("Error loading content:", err); }
    };

    const handleToggleStar = async (e, item) => {
        e.stopPropagation(); 
        const isFolder = item.type === 'Folder' || item.isFolder;
        if (isFolder) return; 

        const newStarredState = !starredItems[item._id];

        try {
            const endpoint = `${BACKEND_URL}/api/files/star/${item._id}`;
            await axios.patch(endpoint, { 
                userId: user?._id || USER_ID,
                isStarred: newStarredState 
            });
            setStarredItems(prev => ({ ...prev, [item._id]: newStarredState }));
            if (viewMode === "important") {
                loadContent(currentFolderId);
            }
        } catch (err) {
            alert("Could not update star status.");
        }
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            const allIds = {};
            combinedItems.forEach(item => { allIds[item._id] = true; });
            setItemsToTransfer(allIds);
        } else {
            setItemsToTransfer({});
        }
    };

    const handleDeleteItem = async (item) => {
        const isFolder = item.type === 'Folder' || item.isFolder;
        const displayName = item.displayName || item.originalName || item.folderName || item.name;
        
        if (!window.confirm(`Delete ${isFolder ? 'folder' : 'file'}: "${displayName}"?`)) return;

        try {
            const endpoint = isFolder 
                ? `${BACKEND_URL}/api/folders/${item._id}` 
                : `${BACKEND_URL}/api/files/${item._id}`;

            await axios.delete(endpoint, { data: { userId: user?._id || USER_ID } });
            
            await loadContent(currentFolderId);
            
            if (isReceivedModalOpen) {
                fetchReceivedFiles();
            }
        } catch (err) { 
            console.error(err);
            alert("Delete failed."); 
        }
    };

    const handleBulkDelete = async () => {
        const selectedIds = Object.keys(itemsToTransfer).filter(id => itemsToTransfer[id]);
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedIds.length} selected item(s)?`)) return;

        try {
            for (const id of selectedIds) {
                const isFolder = foldersInCurrentView.some(f => f._id === id);
                const endpoint = isFolder ? `${BACKEND_URL}/api/folders/${id}` : `${BACKEND_URL}/api/files/${id}`;
                await axios.delete(endpoint, { data: { userId: user?._id || USER_ID } });
            }
            alert("Bulk deletion complete.");
            await loadContent(currentFolderId);
        } catch (err) {
            alert("Some items could not be deleted.");
            await loadContent(currentFolderId);
        }
    };

    /**
     * fetchReceivedFiles
     * UPDATED: Fetches files and folders specifically transferred to the user
     * using the backend route that looks at the 'Transfer' collection.
     */
    const fetchReceivedFiles = async () => {
        try {
            const currentUserId = user?._id || USER_ID;
            
            // This endpoint now specifically triggers the logic to find files 
            // where uploadedBy matches currentUserId (post-approval ownership)
            const response = await axios.get(`${BACKEND_URL}/api/requests/received`, {
                params: { userId: currentUserId } 
            });
            
            const receivedFiles = response.data.files || [];
            const receivedFolders = response.data.folders || [];

            // Combine files and folders, ensuring metadata is preserved
            const items = [
                ...receivedFolders.map(f => ({ 
                    ...f, 
                    isFolder: true, 
                    displayName: f.folderName || f.name,
                    sender: f.senderUsername || "Shared Folder" 
                })),
                ...receivedFiles.map(f => ({ 
                    ...f, 
                    isFolder: false, 
                    displayName: f.originalName || f.filename,
                    sender: f.senderUsername || f.username || "Shared File"
                }))
            ];

            setReceivedItems(items);
            setIsReceivedModalOpen(true);
        } catch (err) {
            console.error("Fetch Received Error:", err);
            alert("Could not load received files. Ensure the backend route /api/requests/received is configured correctly.");
        }
    };

    const handleViewFile = (file) => {
        // Logic to determine folder name in the /uploads/ directory
        const folderName = file.username || file.uploadedByUsername || file.senderUsername || "Admin"; 
        const fileUrl = `${BACKEND_URL}/uploads/${folderName}/${encodeURIComponent(file.filename)}`;
        window.open(fileUrl, '_blank');
    };

    const handleDownload = async (file) => {
        try {
            const response = await axios({
                url: `${BACKEND_URL}/api/files/download/${file._id}`,
                method: 'GET',
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.originalName || file.filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) { alert("Download failed."); }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return alert("Please select a file first.");
        const formData = new FormData();
        formData.append("username", user?.username || "Admin"); 
        formData.append("folderId", currentFolderId || "null");
        formData.append("uploadedBy", user?._id || USER_ID);
        formData.append("departmentId", user?.departmentId || DEPARTMENT_ID);
        formData.append("file", selectedFile);

        try {
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData);
            setSelectedFile(null);
            loadContent(currentFolderId); 
            alert(`Uploaded successfully!`);
        } catch (err) { alert("Upload failed."); }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return alert("Enter folder name");
        try {
            await axios.post(`${BACKEND_URL}/api/folders/create`, {
                name: folderName, 
                parent: currentFolderId || null, 
                createdBy: user?._id || USER_ID, 
                departmentId: user?.departmentId || DEPARTMENT_ID,
            });
            setFolderName("");
            loadContent(currentFolderId);
        } catch (err) { console.error(err); }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolderId(folder._id);
        setCurrentPath((prev) => [...prev, { _id: folder._id, name: folder.folderName || folder.name }]);
    };

    const handlePathClick = (item) => {
        const index = currentPath.findIndex(p => p._id === item._id);
        if (index !== -1) {
            setCurrentPath(currentPath.slice(0, index + 1));
            setCurrentFolderId(item._id);
        }
    };

    const handleGoBack = () => {
        if (currentPath.length > 1) {
            const newPath = [...currentPath];
            newPath.pop(); 
            setCurrentPath(newPath);
            setCurrentFolderId(newPath[newPath.length - 1]._id);
        }
    };

    const handleSelectItem = (id) => {
        setItemsToTransfer(prev => ({ ...prev, [id]: !prev[id] }));
    };

    let combinedItems = [];
    const foldersMapped = foldersInCurrentView.map(f => ({ ...f, type: 'Folder', displayName: f.folderName || f.name }));
    const filesMapped = filesInCurrentView.map(f => ({ ...f, type: f.mimeType || 'File', displayName: f.originalName || "Unnamed File" }));

    if (viewMode === "important") {
        combinedItems = [...foldersMapped, ...filesMapped];
    } else {
        combinedItems = currentFolderId === null ? [...foldersMapped] : [...foldersMapped, ...filesMapped];
    }

    if (searchQuery) {
        combinedItems = combinedItems.filter(item => 
            item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    const selectedCount = Object.values(itemsToTransfer).filter(Boolean).length;
    const isAllSelected = combinedItems.length > 0 && selectedCount === combinedItems.length;

    return (
        <div className={`file-explorer-app-single-pane ${isDark ? "dark-theme" : "light-theme"}`}>
            <main className="main-content">
                <header className="main-header mb-4">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center">
                            <h1 className="mb-0">
                                {viewMode === "important" ? "⭐ Important Files" : "📁 File Manager"}
                            </h1>
                        </div>
                        {viewMode !== "important" && (
                            <button className={`btn ${isDark ? 'btn-outline-light' : 'btn-outline-primary'} border-2 fw-bold px-4 rounded-pill`} onClick={fetchReceivedFiles}>
                                <i className="fas fa-inbox me-2"></i> Received
                            </button>
                        )}
                    </div>
                </header>
                
                <div className={`main-actions-toolbar ${isDark ? 'dark-toolbar' : ''}`}>
                    {viewMode !== "important" ? (
                        <>
                            <div className="action-group create-group d-flex align-items-center has-right-border">
                                <button 
                                    className={`btn btn-sm ${isDark ? 'btn-secondary text-white' : 'btn-outline-secondary'} me-2`} 
                                    onClick={handleGoBack} 
                                    disabled={currentFolderId === null}
                                >
                                    <i className="fas fa-arrow-left"></i>
                                </button>
                                <input 
                                    type="text" 
                                    placeholder="New folder..." 
                                    value={folderName} 
                                    onChange={(e) => setFolderName(e.target.value)} 
                                    className="create-input" 
                                />
                                <button onClick={handleCreateFolder} className="create-btn">Create</button>
                            </div>

                            {currentFolderId !== null && (
                                <div className="action-group upload-group d-flex align-items-center ms-2">
                                    <label className="upload-label-main btn btn-sm btn-outline-primary mb-0 d-flex align-items-center py-1 px-2" htmlFor="file-input" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <i className="fas fa-plus-circle me-1"></i> {selectedFile ? "Ready" : "Add File"}
                                    </label>
                                    <input id="file-input" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} hidden />
                                    <button 
                                        onClick={handleFileUpload} 
                                        disabled={!selectedFile} 
                                        className="btn btn-sm btn-primary ms-1 py-1 px-2"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        Upload
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="action-group d-flex align-items-center">
                            <i className="fas fa-star text-warning me-2"></i>
                            <span className={isDark ? "text-light-50 small" : "text-muted small"} style={{ opacity: isDark ? 0.7 : 1 }}>
                                Starred items from all folders.
                            </span>
                        </div>
                    )}

                    <div className="action-group search-group ms-auto">
                        <i className="fas fa-search search-icon ms-2"></i>
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="search-input" 
                        />
                    </div>
                </div>

                {viewMode !== "important" && (
                    <div className="breadcrumb-container mt-3 px-1">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0">
                                {currentPath.map((item, index) => (
                                    <li key={item._id || index} 
                                        className={`breadcrumb-item ${index === currentPath.length-1 ? 'active' : ''}`}
                                        onClick={() => handlePathClick(item)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {item.name}
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                )}

                <div className="list-toolbar mt-4 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">
                        {viewMode === "important" ? "Starred Content" : currentFolderId === null ? "Folders" : "Files & Folders"}
                    </h5>
                    
                    {viewMode !== "important" && selectedCount > 0 && (
                        <div className="selection-action-bar animate__animated animate__fadeInDown d-flex align-items-center gap-2 p-2 px-3 rounded-pill shadow-sm" 
                             style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: '1px solid #ddd' }}>
                            <span className="me-3 small fw-bold text-primary">{selectedCount} Selected</span>
                            <button 
                                onClick={() => setIsTransferModalOpen(true)} 
                                className="btn btn-success btn-sm rounded-pill px-3 d-flex align-items-center"
                            >
                                <i className="fas fa-paper-plane me-2"></i> Transfer
                            </button>
                            <button 
                                onClick={handleBulkDelete} 
                                className="btn btn-danger btn-sm rounded-pill px-3 d-flex align-items-center"
                            >
                                <i className="fas fa-trash me-2"></i> Delete
                            </button>
                            <div className="vr mx-2"></div>
                            <button className="btn btn-link btn-sm text-muted p-0" onClick={() => setItemsToTransfer({})}>
                                <i className="fas fa-times-circle"></i>
                            </button>
                        </div>
                    )}
                </div>

                <div className="file-table-container mt-3">
                    <table className="file-table">
                        <thead>
                            <tr>
                                <th style={{width: '40px'}}>
                                    {viewMode !== "important" && (
                                        <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="form-check-input" />
                                    )}
                                </th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Modified</th>
                                <th>Size</th>
                                <th style={{textAlign: 'right'}}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedItems.length > 0 ? combinedItems.map((item) => (
                                <tr key={item._id} 
                                    onDoubleClick={item.type === 'Folder' ? () => handleFolderClick(item) : null}
                                    className={itemsToTransfer[item._id] ? 'table-active' : ''}>
                                    <td>
                                        {viewMode !== "important" && (
                                            <input 
                                                type="checkbox" 
                                                checked={!!itemsToTransfer[item._id]} 
                                                onChange={() => handleSelectItem(item._id)} 
                                                className="form-check-input"
                                            />
                                        )}
                                    </td>
                                    <td className={item.type === 'Folder' ? 'folder-row' : ''}>
                                        <div className="d-flex align-items-center">
                                            <i className={`${item.type === 'Folder' ? 'fas fa-folder text-warning' : getFileIcon(item.type)} file-icon me-3 fs-5`}></i>
                                            <span className="text-truncate" style={{maxWidth: '250px'}}>{item.displayName}</span>
                                            
                                            {item.type !== 'Folder' && (
                                                <i 
                                                    className={`${starredItems[item._id] ? 'fas fa-star text-warning' : 'far fa-star text-muted'} ms-3`}
                                                    style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                                                    onClick={(e) => handleToggleStar(e, item)}
                                                ></i>
                                            )}
                                        </div>
                                    </td>
                                    <td><span className="badge bg-light text-dark border">{formatMimeType(item.type)}</span></td>
                                    <td className="text-muted small">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                                    <td className="text-muted small">{item.type === 'Folder' ? '—' : formatBytes(item.size)}</td>
                                    <td>
                                        <div className="d-flex gap-3 justify-content-end align-items-center">
                                            {item.type !== 'Folder' && (
                                                <button className="btn btn-link btn-sm p-0" title="View" onClick={() => handleViewFile(item)}>
                                                    <i className="fas fa-eye text-primary"></i>
                                                </button>
                                            )}
                                            {viewMode !== "important" && (
                                                <button className="btn btn-link btn-sm p-0" title="Delete" onClick={() => handleDeleteItem(item)}>
                                                    <i className="fas fa-trash-alt text-danger"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="empty-message py-5 text-center">
                                        <i className="fas fa-folder-open d-block mb-3 text-muted" style={{fontSize: '3rem'}}></i>
                                        <p className="mb-0 text-muted">
                                            {viewMode === "important" ? "No starred items found." : 
                                             currentFolderId === null ? "No folders created yet. Create one to start uploading files." : 
                                             "This folder is empty. Upload files to see them here."}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Received Files Modal */}
            {isReceivedModalOpen && (
                <div className="modal-overlay">
                    <div className="received-files-modal shadow-lg" style={{ maxWidth: '850px', width: '90%', borderRadius: '12px', background: isDark ? '#2d2d2d' : 'white' }}>
                        <div className="modal-header d-flex justify-content-between align-items-center p-3 border-bottom">
                            <h4 className="mb-0 fw-bold"><i className="fas fa-inbox me-2 text-primary"></i>Received Files</h4>
                            <button className={`btn-close ${isDark ? 'btn-close-white' : ''}`} onClick={() => setIsReceivedModalOpen(false)}></button>
                        </div>
                        <div className="modal-body p-0">
                            <div className="file-table-container">
                                <table className={`file-table mb-0 ${isDark ? 'table-dark' : ''}`}>
                                    <thead className={isDark ? 'bg-dark' : 'bg-light'}>
                                        <tr>
                                            <th>Name</th>
                                            <th>Size</th>
                                            <th>Sender</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receivedItems.length > 0 ? receivedItems.map((item) => (
                                            <tr key={item._id}>
                                                <td>
                                                    <i className={`${item.isFolder ? 'fas fa-folder text-warning' : getFileIcon(item.mimeType || item.type)} me-2`}></i>
                                                    {item.displayName}
                                                </td>
                                                <td>{item.isFolder ? '—' : formatBytes(item.size)}</td>
                                                <td className="small text-muted">{item.sender}</td>
                                                <td>
                                                    <div className="d-flex gap-3 justify-content-end">
                                                        {!item.isFolder && (
                                                            <>
                                                                <i className="fas fa-eye text-primary action-icon" style={{cursor:'pointer'}} title="View" onClick={() => handleViewFile(item)}></i>
                                                                <i className="fas fa-download text-success action-icon" style={{cursor:'pointer'}} title="Download" onClick={() => handleDownload(item)}></i>
                                                            </>
                                                        )}
                                                        <i className="fas fa-trash-alt text-danger action-icon" style={{cursor:'pointer'}} title="Delete" onClick={() => handleDeleteItem({...item, type: item.isFolder ? 'Folder' : 'File'})}></i>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="text-center py-5 text-muted">No files received yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer border-top p-3">
                            <button className="btn btn-secondary px-4" onClick={() => setIsReceivedModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {isTransferModalOpen && (
                <TransferModal 
                    selectedIds={Object.keys(itemsToTransfer).filter(id => itemsToTransfer[id])}
                    senderUsername={user?.username || "Admin"} 
                    user={user} 
                    onClose={() => setIsTransferModalOpen(false)}
                    currentTheme={currentTheme}
                    onSuccess={async () => { 
                        setItemsToTransfer({}); 
                        setIsTransferModalOpen(false); 
                        await loadContent(currentFolderId); 
                    }}
                />
            )}
        </div>
    );
} 

export default UploadFilePage;