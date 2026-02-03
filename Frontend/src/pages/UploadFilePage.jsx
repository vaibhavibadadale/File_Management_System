import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
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
    const [isDeleting, setIsDeleting] = useState(false);

    const isDark = currentTheme === "dark";
    const userRole = (user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "hod";
    const userDeptId = user?.departmentId || (isAdmin ? null : DEPARTMENT_ID);
    const currentUserId = user?._id || USER_ID;

    const loadContent = useCallback(async (parentId) => {
        setItemsToTransfer({});
        
        let params = { 
            userId: currentUserId,
            parentId: parentId || "null",
            folderId: parentId || "null"
        };

        if (viewMode === "important") {
            params.isStarred = true;
            delete params.parentId; 
        } else if (userDeptId && !isAdmin) {
            params.departmentId = userDeptId;
        }

        try {
            const [folderRes, fileRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/folders`, { params }),
                axios.get(`${BACKEND_URL}/api/files`, { params })
            ]);

            const userFolders = (folderRes.data.folders || []).filter(f => 
                (f.createdBy === currentUserId || f.uploadedBy === currentUserId || isAdmin) && 
                (f.transferStatus === 'none' || !f.transferStatus)
            );
            
            const userFiles = (fileRes.data.files || []).filter(f => 
                (f.uploadedBy === currentUserId || isAdmin) && 
                (f.transferStatus === 'none' || !f.transferStatus)
            );

            setFoldersInCurrentView(userFolders);
            setFilesInCurrentView(userFiles);

            const stars = {};
            [...userFolders, ...userFiles].forEach(item => {
                if (item.isStarred) stars[item._id] = true;
            });
            setStarredItems(stars);
        } catch (err) { 
            console.error("Error loading content:", err); 
        }
    }, [currentUserId, isAdmin, userDeptId, viewMode]);

    useEffect(() => {
        loadContent(currentFolderId);
    }, [currentFolderId, loadContent]);

    const handleFileUpload = async () => {
        if (!selectedFile) return alert("Select a file.");
        const formData = new FormData();
        formData.append("username", user?.username || "Admin");
        formData.append("folderId", currentFolderId || "null");
        formData.append("uploadedBy", currentUserId);
        formData.append("departmentId", userDeptId || "");
        formData.append("file", selectedFile);
        formData.append("transferStatus", "none");

        try {
            await axios.post(`${BACKEND_URL}/api/files/upload`, formData);
            setSelectedFile(null); 
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = "";
            
            setTimeout(() => loadContent(currentFolderId), 500);
            
            Swal.fire({ title: "Success", text: "File uploaded successfully.", icon: "success", timer: 1500, showConfirmButton: false });
        } catch (err) { 
            console.error(err);
            alert("Upload failed."); 
        }
    };

    const fetchReceivedFiles = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/requests/received`, { params: { userId: currentUserId } });
            const rawData = response.data.data || { files: [], folders: [] };
            
            // Map folders with role from database
            const folders = (rawData.folders || []).map(f => ({ 
                ...f, 
                isFolder: true, 
                type: 'Folder', 
                displayName: f.folderName || f.name, 
                sender: f.senderId?.username || "System", 
                senderRole: f.senderId?.role || "user" // Fetching role from senderId object
            }));

            // Map files with role from database
            const files = (rawData.files || []).map(f => ({ 
                ...f, 
                isFolder: false, 
                displayName: f.originalName || f.filename, 
                sender: f.senderId?.username || "System", 
                senderRole: f.senderId?.role || "user" // Fetching role from senderId object
            }));

            setReceivedItems([...folders, ...files]);
            setIsReceivedModalOpen(true);
        } catch (err) { 
            console.error("Fetch Received Error:", err); 
            Swal.fire("Error", "Could not load received files.", "error"); 
        }
    };

    const handleToggleStar = async (e, item) => {
        e.stopPropagation();
        if (item.isDisabled && !isAdmin) return;
        if (item.type === 'Folder' || item.isFolder) return;
        const newStarredState = !starredItems[item._id];
        try {
            await axios.patch(`${BACKEND_URL}/api/files/star/${item._id}`, { userId: currentUserId, isStarred: newStarredState });
            setStarredItems(prev => ({ ...prev, [item._id]: newStarredState }));
            if (viewMode === "important") loadContent(currentFolderId);
        } catch (err) { alert("Could not update star status."); }
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            const allIds = {};
            combinedItems.forEach(item => { allIds[item._id] = true; });
            setItemsToTransfer(allIds);
        } else { setItemsToTransfer({}); }
    };

    const handleDeleteItemTrigger = async (item) => {
        const { value: formValues } = await Swal.fire({
            title: 'Request Deletion',
            html: `<p class="small text-muted">Requesting to delete: <b>${item.displayName || item.originalName}</b></p>` + `<input id="swal-password" type="password" class="swal2-input" placeholder="Confirm Password">` + `<textarea id="swal-reason" class="swal2-textarea" placeholder="Reason for deletion..."></textarea>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Submit Request', confirmButtonColor: '#dc3545', background: isDark ? '#2d2d2d' : '#fff', color: isDark ? '#fff' : '#000',
            preConfirm: () => {
                const password = document.getElementById('swal-password').value;
                const reason = document.getElementById('swal-reason').value;
                if (!password || !reason) { Swal.showValidationMessage('Please enter both password and reason'); return false; }
                return { password, reason };
            }
        });
        if (formValues) {
            try {
                await axios.post(`${BACKEND_URL}/api/users/verify-password`, { userId: currentUserId, password: formValues.password });
                await axios.post(`${BACKEND_URL}/api/requests/create`, { requestType: "delete", senderUsername: user?.username || "Unknown", senderRole: user?.role || "user", departmentId: userDeptId, fileIds: [item._id], reason: formValues.reason });
                Swal.fire({ title: "Request Sent", text: "Your deletion request is pending admin approval.", icon: "success", background: isDark ? '#2d2d2d' : '#fff', color: isDark ? '#fff' : '#000' });
            } catch (err) { Swal.fire("Error", "Incorrect password or submission error.", "error"); }
        }
    };

    const executeBulkDeleteRequest = async () => {
        const selectedIds = Object.keys(itemsToTransfer).filter(id => itemsToTransfer[id]);
        if (selectedIds.length === 0) return Swal.fire("Info", "No items selected.", "info");
        const { value: formValues } = await Swal.fire({
            title: 'Confirm Bulk Deletion Request',
            html: `<p class="small text-muted">Requesting to delete <b>${selectedIds.length}</b> items</p>` + `<input id="bulk-swal-password" type="password" class="swal2-input" placeholder="Confirm Password">` + `<textarea id="bulk-swal-reason" class="swal2-textarea" placeholder="Reason for bulk deletion..."></textarea>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Send Bulk Request', confirmButtonColor: '#dc3545', background: isDark ? '#2d2d2d' : '#fff', color: isDark ? '#fff' : '#000',
            preConfirm: () => {
                const password = document.getElementById('bulk-swal-password').value;
                const reason = document.getElementById('bulk-swal-reason').value;
                if (!password || !reason) { Swal.showValidationMessage('Password and reason are required'); return false; }
                return { password, reason };
            }
        });
        if (formValues) {
            setIsDeleting(true);
            try {
                await axios.post(`${BACKEND_URL}/api/users/verify-password`, { userId: currentUserId, password: formValues.password });
                await axios.post(`${BACKEND_URL}/api/requests/create`, { requestType: "delete", senderUsername: user?.username || "Admin", senderRole: user?.role || "user", departmentId: userDeptId, fileIds: selectedIds, reason: formValues.reason });
                Swal.fire({ title: "Success", text: "Bulk deletion request submitted.", icon: "success", background: isDark ? '#2d2d2d' : '#fff', color: isDark ? '#fff' : '#000' });
                setItemsToTransfer({}); loadContent(currentFolderId);
            } catch (err) { Swal.fire("Error", "Error submitting request.", "error"); } finally { setIsDeleting(false); }
        }
    };

    const handleViewFile = async (file) => {
        if (file.isDisabled && !isAdmin) return Swal.fire({ icon: 'error', title: 'File Restricted', text: 'This file is disabled.', background: isDark ? '#2d2d2d' : '#fff', color: isDark ? '#fff' : '#000' });
        try {
            await axios.post(`${BACKEND_URL}/api/files/track-view`, { fileId: file._id, userId: currentUserId });
            const ownerName = file.username || file.uploadedByUsername || file.senderUsername || "Admin";
            window.open(`${BACKEND_URL}/uploads/${ownerName}/${encodeURIComponent(file.filename)}`, '_blank');
        } catch (err) { 
            const ownerName = file.username || file.uploadedByUsername || file.senderUsername || "Admin";
            window.open(`${BACKEND_URL}/uploads/${ownerName}/${encodeURIComponent(file.filename)}`, '_blank'); 
        }
    };

    const handleDownload = async (file) => {
        if (file.isDisabled && !isAdmin) return Swal.fire({ icon: 'error', title: 'Restricted', text: 'File disabled.' });
        try {
            const response = await axios({ url: `${BACKEND_URL}/api/files/download/${file._id}`, method: 'GET', responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url; link.setAttribute('download', file.originalName || file.filename);
            document.body.appendChild(link); link.click(); link.remove();
        } catch (err) { alert("Download failed."); }
    };

    const handleCreateFolder = async () => {
        if (!folderName) return alert("Enter name");
        try {
            await axios.post(`${BACKEND_URL}/api/folders/create`, { name: folderName, parent: currentFolderId || null, createdBy: currentUserId, uploadedBy: currentUserId, departmentId: userDeptId || null, transferStatus: 'none' });
            setFolderName(""); await loadContent(currentFolderId);
        } catch (err) { console.error(err); }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolderId(folder._id);
        setCurrentPath((prev) => [...prev, { _id: folder._id, name: folder.folderName || folder.name }]);
    };

    const handlePathClick = (item) => {
        const index = currentPath.findIndex(p => p._id === item._id);
        if (index !== -1) {
            const newPath = currentPath.slice(0, index + 1);
            setCurrentPath(newPath);
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

    const handleSelectItem = (id) => { setItemsToTransfer(prev => ({ ...prev, [id]: !prev[id] })); };

    const foldersMapped = foldersInCurrentView.map(f => ({ ...f, type: 'Folder', displayName: f.folderName || f.name }));
    const filesMapped = filesInCurrentView.map(f => ({ ...f, type: f.mimeType || 'File', displayName: f.originalName || f.filename || "Unnamed" }));
    let combinedItems = [...foldersMapped, ...filesMapped];
    if (searchQuery) combinedItems = combinedItems.filter(item => item.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedCount = Object.values(itemsToTransfer).filter(Boolean).length;
    const isAllSelected = combinedItems.length > 0 && selectedCount === combinedItems.length;

    return (
        <div className={`file-explorer-app-single-pane ${isDark ? "dark-theme" : "light-theme"}`}>
            <main className="main-content">
                <header className="main-header mb-4">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <h1 className="mb-0">{viewMode === "important" ? "⭐ Important Files" : "📁 File Manager"}</h1>
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
                                <button className={`btn btn-sm ${isDark ? 'btn-secondary text-white' : 'btn-outline-secondary'} me-2`} onClick={handleGoBack} disabled={currentFolderId === null}>
                                    <i className="fas fa-arrow-left"></i>
                                </button>
                                <input type="text" placeholder="New folder..." value={folderName} onChange={(e) => setFolderName(e.target.value)} className="create-input" />
                                <button onClick={handleCreateFolder} className="create-btn">Create</button>
                            </div>
                            
                            {currentFolderId !== null && (
                                <div className="action-group upload-group d-flex align-items-center ms-2">
                                    <label className="btn btn-sm btn-outline-primary mb-0 py-1 px-2 d-flex align-items-center justify-content-center" htmlFor="file-input" style={{ fontSize: '0.85rem', cursor: 'pointer', height: '31px', minWidth: '90px' }}>
                                        <i className="fas fa-plus-circle me-1"></i> {selectedFile ? "Ready" : "Add File"}
                                    </label>
                                    <input id="file-input" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} hidden />
                                    <button onClick={handleFileUpload} disabled={!selectedFile} className="btn btn-sm btn-primary ms-1 py-1 px-2" style={{ fontSize: '0.85rem', height: '31px' }}>Upload</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="action-group d-flex align-items-center">
                            <i className="fas fa-star text-warning me-2"></i>
                            <span className={isDark ? "text-light-50 small" : "text-muted small"}>Starred items from all folders.</span>
                        </div>
                    )}
                    <div className="action-group search-group ms-auto">
                        <i className="fas fa-search search-icon ms-2"></i>
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                    </div>
                </div>

                {viewMode !== "important" && (
                    <div className="breadcrumb-container mt-3 px-1">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0">
                                {currentPath.map((item, index) => (
                                    <li key={item._id || index} className={`breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}`} onClick={() => handlePathClick(item)} style={{ cursor: 'pointer' }}>
                                        {item.name}
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                )}

                <div className="list-toolbar mt-4 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">{viewMode === "important" ? "Starred Content" : currentFolderId === null ? "Folders & Files" : "Files & Folders"}</h5>
                    {viewMode !== "important" && selectedCount > 0 && (
                        <div className="selection-action-bar d-flex align-items-center gap-2 p-2 px-3 rounded-pill shadow-sm" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: '1px solid #ddd' }}>
                            <span className="me-3 small fw-bold text-primary">{selectedCount} Selected</span>
                            <button onClick={() => setIsTransferModalOpen(true)} className="btn btn-success btn-sm rounded-pill px-3"><i className="fas fa-paper-plane me-2"></i> Transfer</button>
                            <button onClick={executeBulkDeleteRequest} className="btn btn-danger btn-sm rounded-pill px-3" disabled={isDeleting}>
                                {isDeleting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-trash me-2"></i>} Delete
                            </button>
                            <button className="btn btn-link btn-sm text-muted p-0" onClick={() => setItemsToTransfer({})}><i className="fas fa-times-circle"></i></button>
                        </div>
                    )}
                </div>

                <div className="file-table-container mt-3">
                    <table className="file-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>{viewMode !== "important" && <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="form-check-input" />}</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Modified</th>
                                <th>Size</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedItems.length > 0 ? combinedItems.map((item) => (
                                <tr key={item._id} onDoubleClick={item.type === 'Folder' ? () => handleFolderClick(item) : null} className={`${itemsToTransfer[item._id] ? 'table-active' : ''} ${item.isDisabled ? 'opacity-50' : ''}`}>
                                    <td>{viewMode !== "important" && <input type="checkbox" checked={!!itemsToTransfer[item._id]} onChange={() => handleSelectItem(item._id)} className="form-check-input" />}</td>
                                    <td className={item.type === 'Folder' ? 'folder-row' : ''}>
                                        <div className="d-flex align-items-center">
                                            <i className={`${item.type === 'Folder' ? 'fas fa-folder text-warning' : getFileIcon(item.type || item.mimeType)} file-icon me-3 fs-5`}></i>
                                            <span className={`text-truncate ${item.isDisabled ? 'text-decoration-line-through text-muted' : ''}`} style={{ maxWidth: '250px' }}>{item.displayName}</span>
                                            {item.isDisabled && <span className="badge bg-danger ms-2" style={{ fontSize: '0.65rem' }}>Disabled</span>}
                                            {item.type !== 'Folder' && !item.isDisabled && (
                                                <i className={`${starredItems[item._id] ? 'fas fa-star text-warning' : 'far fa-star text-muted'} ms-3`} style={{ cursor: 'pointer', fontSize: '0.9rem' }} onClick={(e) => handleToggleStar(e, item)}></i>
                                            )}
                                        </div>
                                    </td>
                                    <td><span className="badge bg-light text-dark border">{formatMimeType(item.type)}</span></td>
                                    <td className="text-muted small">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                                    <td className="text-muted small">{item.type === 'Folder' ? '—' : formatBytes(item.size)}</td>
                                    <td className="text-end">
                                        <div className="d-flex gap-3 justify-content-end align-items-center">
                                            {item.type !== 'Folder' && (
                                                <button className="btn btn-link btn-sm p-0" onClick={() => handleViewFile(item)} style={{ cursor: item.isDisabled && !isAdmin ? 'not-allowed' : 'pointer' }}>
                                                    <i className={`fas fa-eye ${item.isDisabled ? 'text-muted' : 'text-primary'}`}></i>
                                                </button>
                                            )}
                                            <button className="btn btn-link btn-sm p-0" onClick={() => handleDeleteItemTrigger(item)}><i className="fas fa-trash text-danger"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="empty-message py-5 text-center text-muted"><i className="fas fa-folder-open d-block mb-3" style={{ fontSize: '3rem' }}></i>No items found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {isReceivedModalOpen && (
                <div className="modal-overlay">
                    <div className="received-files-modal shadow-lg" style={{ maxWidth: '900px', width: '95%', borderRadius: '12px', background: isDark ? '#2d2d2d' : 'white' }}>
                        <div className="modal-header d-flex justify-content-between align-items-center p-3 border-bottom">
                            <h4 className={`mb-0 fw-bold ${isDark ? 'text-white' : ''}`}><i className="fas fa-inbox me-2 text-primary"></i>Received Files</h4>
                            <button className={`btn-close ${isDark ? 'btn-close-white' : ''}`} onClick={() => setIsReceivedModalOpen(false)}></button>
                        </div>
                        <div className="modal-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table className={`file-table mb-0 ${isDark ? 'table-dark' : ''}`}>
                                <thead className={isDark ? 'bg-dark sticky-top' : 'bg-light sticky-top'}>
                                    <tr>
                                        <th>Name</th>
                                        <th>Sender</th>
                                        <th>Sender Role</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receivedItems.length > 0 ? receivedItems.map((item) => (
                                        <tr key={item._id} className={item.isDisabled ? 'opacity-50' : ''}>
                                            <td className={isDark ? 'text-white' : ''}>
                                                <div className="d-flex align-items-center">
                                                    <i className={`${item.isFolder ? 'fas fa-folder text-warning' : getFileIcon(item.mimeType || item.type)} me-2`}></i>
                                                    <div>
                                                        <span className={item.isDisabled ? 'text-decoration-line-through' : ''}>{item.displayName}</span>
                                                        <div className="text-muted" style={{fontSize: '0.7rem'}}>{item.isFolder ? 'Folder' : formatBytes(item.size)}</div>
                                                        {item.lastTransferDate && (
                                                            <div className="text-primary" style={{fontSize: '0.6rem'}}>Received: {new Date(item.lastTransferDate).toLocaleDateString()}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={isDark ? 'text-white-50' : 'text-muted'}><span className="fw-bold">{item.sender}</span></td>
                                            <td>
                                                <span className={`badge ${
                                                    ['superadmin', 'admin', 'hod'].includes(item.senderRole?.toLowerCase()) 
                                                    ? 'bg-danger' 
                                                    : 'bg-info'
                                                } text-dark`}>
                                                    {(item.senderRole || 'User').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex gap-3 justify-content-end">
                                                    {!item.isFolder && (
                                                        <>
                                                            <i className={`fas fa-eye action-icon ${item.isDisabled ? 'text-muted' : 'text-primary'}`} style={{ cursor: item.isDisabled && !isAdmin ? 'not-allowed' : 'pointer' }} onClick={() => handleViewFile(item)}></i>
                                                            <i className={`fas fa-download action-icon ${item.isDisabled ? 'text-muted' : 'text-success'}`} style={{ cursor: item.isDisabled && !isAdmin ? 'not-allowed' : 'pointer' }} onClick={() => handleDownload(item)}></i>
                                                        </>
                                                    )}
                                                    <i className="fas fa-trash text-danger action-icon" style={{ cursor: 'pointer' }} onClick={() => handleDeleteItemTrigger(item)}></i>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="text-center py-5 text-muted">No files have been received yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
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
                    departmentId={userDeptId}
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