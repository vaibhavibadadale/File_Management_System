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

function UploadFilePage({ user, viewMode }) {
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
        const newStarredState = !starredItems[item._id];

        try {
            const endpoint = isFolder 
                ? `${BACKEND_URL}/api/folders/star/${item._id}` 
                : `${BACKEND_URL}/api/files/star/${item._id}`;

            await axios.patch(endpoint, { 
                userId: user?._id || USER_ID,
                isStarred: newStarredState 
            });

            setStarredItems(prev => ({ ...prev, [item._id]: newStarredState }));
            
            if (viewMode === "important") {
                loadContent(currentFolderId);
            }
        } catch (err) {
            console.error("Star toggle failed:", err);
            alert("Could not update star status.");
        }
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            const allIds = {};
            combinedItems.forEach(item => {
                allIds[item._id] = true;
            });
            setItemsToTransfer(allIds);
        } else {
            setItemsToTransfer({});
        }
    };

    const handleDeleteItem = async (item) => {
        const isFolder = item.type === 'Folder' || item.isFolder;
        if (!window.confirm(`Delete ${isFolder ? 'folder' : 'file'}: "${item.displayName || item.originalName || item.folderName}"?`)) return;

        try {
            const endpoint = isFolder 
                ? `${BACKEND_URL}/api/folders/${item._id}` 
                : `${BACKEND_URL}/api/files/${item._id}`;

            await axios.delete(endpoint, { data: { userId: user?._id || USER_ID } });
            
            await loadContent(currentFolderId);
            if (isReceivedModalOpen) fetchReceivedFiles();
        } catch (err) { alert("Delete failed."); }
    };

    const handleBulkDelete = async () => {
        const selectedIds = Object.keys(itemsToTransfer).filter(id => itemsToTransfer[id]);
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) return;

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

    const fetchReceivedFiles = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/transfer/received`, {
                params: { recipientId: user?._id || USER_ID }
            });
            setReceivedItems(res.data.transferredFiles || []);
            setIsReceivedModalOpen(true);
        } catch (err) { alert("Could not load received files."); }
    };

    const handleViewFile = (file) => {
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

    let combinedItems = [
        ...foldersInCurrentView.map(f => ({ ...f, type: 'Folder', displayName: f.folderName || f.name })),
        ...filesInCurrentView.map(f => ({ ...f, type: f.mimeType || 'File', displayName: f.originalName || "Unnamed File" }))
    ];

    if (searchQuery) {
        combinedItems = combinedItems.filter(item => item.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const selectedCount = Object.values(itemsToTransfer).filter(Boolean).length;
    const isAllSelected = combinedItems.length > 0 && selectedCount === combinedItems.length;

    return (
        <div className="file-explorer-app-single-pane">
            <main className="main-content">
                <header className="main-header mb-4">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center">
                            <h1 className="mb-0">
                                {viewMode === "important" ? "⭐ Important Files" : "📁 File Manager"}
                            </h1>
                            <span className="badge bg-info ms-3 text-uppercase">{user?.departmentName || "General"}</span>
                        </div>
                        {/* Received button hidden in important mode */}
                        {viewMode !== "important" && (
                            <button className="btn btn-outline-primary" onClick={fetchReceivedFiles}>
                                <i className="fas fa-inbox me-2"></i> Received Files
                            </button>
                        )}
                    </div>
                </header>
                
                <div className="main-actions-toolbar">
                    {viewMode !== "important" ? (
                        <>
                            <div className="action-group create-group d-flex align-items-center">
                                <button className="btn btn-outline-secondary me-2" onClick={handleGoBack} disabled={currentFolderId === null}><i className="fas fa-arrow-left"></i></button>
                                <input type="text" placeholder="New folder..." value={folderName} onChange={(e) => setFolderName(e.target.value)} className="create-input" />
                                <button onClick={handleCreateFolder} className="create-btn">New Folder</button>
                            </div>

                            <div className="action-group upload-group">
                                <label className="upload-label-main" htmlFor="file-input"><i className="fas fa-upload"></i> Upload</label>
                                <input id="file-input" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} hidden />
                                <button onClick={handleFileUpload} disabled={!selectedFile} className="upload-btn-main">Go</button>
                            </div>
                        </>
                    ) : (
                        <div className="action-group d-flex align-items-center">
                            <i className="fas fa-info-circle text-muted me-2"></i>
                            <span className="text-muted small">Viewing all starred items across your workspace.</span>
                        </div>
                    )}

                    <div className="action-group search-group">
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                    </div>
                </div>

                {viewMode !== "important" && (
                    <div className="breadcrumb mb-3">
                        {currentPath.map((item, index) => (
                            <span key={item._id || index} className="path-item" onClick={() => handlePathClick(item)} style={{cursor: 'pointer'}}>
                                {item.name} {index < currentPath.length - 1 && ' / '}
                            </span>
                        ))}
                    </div>
                )}

                {/* Transfer and Bulk Delete logic hidden in important mode */}
                {viewMode !== "important" && (
                    <div className="list-toolbar mb-3 d-flex gap-2">
                        <button onClick={() => setIsTransferModalOpen(true)} disabled={selectedCount === 0} className="btn btn-primary btn-sm">
                            <i className="fas fa-share-square me-2"></i> Transfer ({selectedCount})
                        </button>
                        <button onClick={handleBulkDelete} disabled={selectedCount === 0} className="btn btn-danger btn-sm">
                            <i className="fas fa-trash-alt me-2"></i> Delete Selected ({selectedCount})
                        </button>
                    </div>
                )}

                <div className="file-table-container">
                    <table className="file-table">
                        <thead>
                            <tr>
                                <th>
                                    {viewMode !== "important" && (
                                        <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} title="Select All" />
                                    )}
                                </th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Size</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedItems.length > 0 ? combinedItems.map((item) => (
                                <tr key={item._id} onDoubleClick={item.type === 'Folder' ? () => handleFolderClick(item) : null}>
                                    <td>
                                        {viewMode !== "important" && (
                                            <input type="checkbox" checked={!!itemsToTransfer[item._id]} onChange={() => handleSelectItem(item._id)} />
                                        )}
                                    </td>
                                    <td style={{ cursor: item.type === 'Folder' ? 'pointer' : 'default' }}>
                                        <div className="d-flex align-items-center">
                                            <i className={`${item.type === 'Folder' ? 'fas fa-folder text-warning' : getFileIcon(item.type)} file-icon me-2`}></i>
                                            <span className="me-2 text-truncate" style={{maxWidth: '250px'}}>{item.displayName}</span>
                                            <i 
                                                className={`${starredItems[item._id] ? 'fas fa-star text-warning' : 'far fa-star text-muted'} star-icon`}
                                                style={{ cursor: 'pointer', opacity: 0.9, fontSize: '0.9rem' }}
                                                onClick={(e) => handleToggleStar(e, item)}
                                                title={starredItems[item._id] ? "Remove from Important" : "Mark as Important"}
                                            ></i>
                                        </div>
                                    </td>
                                    <td>{formatMimeType(item.type)}</td>
                                    <td>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                                    <td>{item.type === 'Folder' ? '—' : formatBytes(item.size)}</td>
                                    <td>
                                        <div className="d-flex gap-3 align-items-center">
                                            {item.type !== 'Folder' && (
                                                <i className="fas fa-eye text-primary" style={{cursor: 'pointer'}} title="View" onClick={() => handleViewFile(item)}></i>
                                            )}
                                            {/* Only allow delete in File Manager mode */}
                                            {viewMode !== "important" && (
                                                <i className="fas fa-trash-alt text-danger" style={{cursor: 'pointer'}} title="Delete" onClick={() => handleDeleteItem(item)}></i>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-5 text-muted">
                                    <i className="fas fa-folder-open d-block mb-2 fs-2"></i>
                                    {viewMode === "important" ? "No starred items yet." : "This folder is empty."}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODALS remain at bottom to avoid breaking logic */}
            {isReceivedModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content received-files-modal" style={{ maxWidth: '850px', width: '90%' }}>
                        <div className="modal-header d-flex justify-content-between align-items-center">
                            <h3 className="mb-0"><i className="fas fa-file-import me-2"></i> Received Files</h3>
                            <button className="btn-close" onClick={() => setIsReceivedModalOpen(false)}></button>
                        </div>
                        <div className="modal-body py-3">
                            <div className="file-table-container">
                                <table className="file-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Size</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receivedItems.length > 0 ? receivedItems.map((item) => (
                                            <tr key={item._id}>
                                                <td>
                                                    <i className={`${item.isFolder ? 'fas fa-folder text-warning' : getFileIcon(item.mimeType)} me-2`}></i>
                                                    {item.originalName || item.folderName || item.name}
                                                </td>
                                                <td>{item.isFolder ? 'Folder' : formatMimeType(item.mimeType)}</td>
                                                <td>{item.isFolder ? '—' : formatBytes(item.size)}</td>
                                                <td>
                                                    <div className="d-flex gap-3 align-items-center">
                                                        {!item.isFolder && (
                                                            <>
                                                                <i className="fas fa-eye text-primary" style={{cursor: 'pointer'}} title="View" onClick={() => handleViewFile(item)}></i>
                                                                <i className="fas fa-download text-success" style={{cursor: 'pointer'}} title="Download" onClick={() => handleDownload(item)}></i>
                                                            </>
                                                        )}
                                                        <i className="fas fa-trash-alt text-danger" style={{cursor: 'pointer'}} title="Delete" onClick={() => handleDeleteItem({...item, type: item.isFolder ? 'Folder' : 'File'})}></i>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="text-center py-4">No received files yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsReceivedModalOpen(false)}>Close</button>
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