import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Button, Form, FormControl, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { 
<<<<<<< HEAD
    Trash, 
    Eye, 
    ClockHistory, 
    FileEarmarkText, 
    ArrowClockwise,
    Filter,
    Search,
    X,
    Star,    
    StarFill 
=======
    Trash, Eye, ClockHistory, FileEarmarkText, 
    ArrowClockwise, Filter, Search, X, 
    ArrowRightSquare // Added for Transfer
>>>>>>> sakshi-features
} from 'react-bootstrap-icons'; 

// Import your api service functions
import { toggleStarApi } from '../services/apiService'; 

const BACKEND_URL = "http://localhost:5000"; 

const FileDashboard = ({ user, currentTheme }) => { 
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('All'); 
    
    const isDarkMode = currentTheme === 'dark';
    const textColor = isDarkMode ? 'text-light' : 'text-dark';
    const itemBg = isDarkMode ? '#2c2c2c' : '#ffffff';
    const headerBg = isDarkMode ? '#333' : '#f1f3f4';

    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            // Calling the direct API endpoint for files
            const response = await axios.get(`${BACKEND_URL}/api/files`); 
            if (response.data.success && Array.isArray(response.data.files)) {
                setUploadedFiles(response.data.files);
            }
        } catch (err) {
            console.error(`Failed to load activity logs.`, err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

<<<<<<< HEAD
    /**
     * Handle Star Click with Optimistic UI Update
     */
    const handleStarClick = async (file) => {
        const newStarredStatus = !file.isStarred;

        // 1. Optimistic Update: Update UI immediately
        setUploadedFiles(prev => prev.map(f => 
            f._id === file._id ? { ...f, isStarred: newStarredStatus } : f
        ));

        try {
            // 2. Send request to backend via the Service
            await toggleStarApi(file._id, 'files', newStarredStatus);
        } catch (err) {
            console.error("Failed to update star status", err);
            // 3. Revert if server fails
            fetchFiles(); 
        }
    };

=======
    // --- DIRECT TRANSFER LOGIC ---
    const handleTransfer = async (fileId, fileName) => {
        const recipient = window.prompt(`Directly transfer "${fileName}" to which username?`);
        if (!recipient) return;

        try {
            const res = await axios.post(`${BACKEND_URL}/api/transfer/create`, {
                senderUsername: user.username,
                recipientId: recipient,
                fileIds: [fileId],
                requestType: 'transfer',
                reason: "Direct Admin Transfer"
            });

            if (res.data.direct) {
                alert("File Transferred Successfully!");
                fetchFiles(); // Refresh list immediately
            }
        } catch (err) {
            alert("Transfer failed: " + (err.response?.data?.message || err.message));
        }
    };

    // --- MODIFIED DELETE LOGIC ---
    const handleDelete = async (fileId, fileName) => {
        const isPrivileged = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase());
        const confirmMsg = isPrivileged 
            ? `ADMIN ACTION: Permanently delete ${fileName}?` 
            : `Send request to delete ${fileName}?`;

        if (window.confirm(confirmMsg)) {
            try {
                const res = await axios.post(`${BACKEND_URL}/api/transfer/create`, {
                    senderUsername: user.username,
                    fileIds: [fileId],
                    requestType: 'delete',
                    reason: isPrivileged ? "Direct Admin Deletion" : "Delete Request"
                });

                if (res.data.direct) {
                    alert("File Deleted Successfully!");
                } else {
                    alert("Delete request sent for approval.");
                }
                fetchFiles();
            } catch (err) {
                alert("Action failed.");
            }
        }
    };

    const handleViewFile = (file) => {
        if (!file.path) return;
        const finalPath = file.path.startsWith('/uploads') ? file.path : `/uploads/${file.path}`;
        window.open(`${BACKEND_URL}${finalPath.replace(/\\/g, '/')}`, '_blank'); 
    };

    // Filters and Mapping
>>>>>>> sakshi-features
    const uniqueUsers = useMemo(() => {
        const users = uploadedFiles.map(f => f.username || 'admin');
        return ['All', ...new Set(users)];
    }, [uploadedFiles]);

    const filteredFiles = uploadedFiles.filter((file) => {
        const matchesName = file.originalName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = userFilter === 'All' || (file.username || 'admin') === userFilter;
        return matchesName && matchesUser;
    });

    if (loading) return <div className="p-5 text-center"><Spinner animation="grow" variant="primary" /></div>;

    return (
        <div className="pb-5" style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff' }}> 
            <div className="container-fluid pt-4 px-4">
<<<<<<< HEAD
                
                {/* --- TOP TITLE --- */}
                <div className="mb-4">
                    <h4 className={`fw-bold mb-0 ${textColor}`}>Activity Monitor</h4>
                </div>

                {/* --- CONTROLS SECTION --- */}
=======
>>>>>>> sakshi-features
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h4 className={`fw-bold mb-0 ${textColor}`}>Activity Monitor</h4>
                        <p className="text-muted small mb-0">Direct Admin Control Enabled</p>
                    </div>
                    
                    <div className="d-flex align-items-center gap-2">
<<<<<<< HEAD
                        <div className="position-relative" style={{ width: '240px' }}>
                            <Search 
                                className="position-absolute top-50 translate-middle-y ms-3 text-muted" 
                                style={{ left: '2px', zIndex: 5 }} 
                                size={13} 
                            />
                            <FormControl 
                                type="text" 
                                placeholder="Search logs..." 
                                className="ps-5 pe-4 rounded-pill border shadow-sm" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                style={{ 
                                    fontSize: '0.8rem', 
                                    height: '35px', 
                                    backgroundColor: isDarkMode ? '#2c2c2c' : '#fff',
                                    color: isDarkMode ? '#fff' : '#000'
                                }} 
                            />
                            {searchTerm && (
                                <X 
                                    className="position-absolute top-50 translate-middle-y text-muted" 
                                    style={{ right: '10px', cursor: 'pointer', zIndex: 5 }} 
                                    size={16} 
                                    onClick={() => setSearchTerm('')}
                                />
                            )}
                        </div>

                        <div className="d-flex align-items-center bg-light p-1 px-3 rounded-pill border shadow-sm" style={{ height: '35px' }}>
                           <Filter size={14} className="text-muted me-2" />
                           <Form.Select 
                                size="sm" 
                                className="border-0 bg-transparent shadow-none fw-bold" 
                                style={{ width: '90px', fontSize: '0.75rem', cursor: 'pointer' }}
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                            >
                                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                            </Form.Select>
                        </div>

                        <Button variant="outline-primary" size="sm" onClick={fetchFiles} className="rounded-pill px-3 shadow-sm border-0 bg-white text-primary fw-bold" style={{ height: '35px', fontSize: '0.8rem' }}>
                            <ArrowClockwise className="me-1" /> Refresh
                        </Button>
=======
                        <FormControl 
                            type="text" placeholder="Search logs..." value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="rounded-pill shadow-sm ps-4" style={{ width: '240px', fontSize: '0.8rem' }} 
                        />
                        <Button variant="outline-primary" onClick={fetchFiles} className="rounded-pill px-3 shadow-sm border-0 bg-white"><ArrowClockwise/></Button>
>>>>>>> sakshi-features
                    </div>
                </div>

                {/* Table Header */}
                <Row className="px-3 py-2 text-uppercase fw-bold text-muted border-bottom mx-0 mb-2 rounded" style={{ fontSize: '0.65rem', backgroundColor: headerBg }}>
                    <Col xs={1}>#</Col>
                    <Col xs={4}>File Name</Col>
                    <Col xs={2}>Path</Col>
                    <Col xs={1}>Size</Col>
                    <Col xs={2}>Date</Col>
                    <Col xs={1}>Owner</Col>
                    <Col xs={1} className="text-center">Action</Col>
                </Row>

                {/* Data Rows */}
                <div className="activity-list">
<<<<<<< HEAD
                    {filteredFiles.length > 0 ? (
                        filteredFiles.map((file, index) => (
                            <Row 
                                key={file._id} 
                                className="align-items-center px-3 py-3 mx-0 border-bottom mb-1 rounded" 
                                style={{ 
                                    backgroundColor: itemBg, 
                                    fontSize: '0.85rem',
                                    border: isDarkMode ? '1px solid #333' : '1px solid #eee'
                                }}
                            >
                                <Col xs={1} className="text-muted small">{index + 1}</Col>
                                
                                <Col xs={4} className="d-flex align-items-center overflow-hidden">
                                    <div 
                                        className="me-2" 
                                        onClick={() => handleStarClick(file)} 
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        {file.isStarred ? (
                                            <StarFill size={14} color="#FFD700" />
                                        ) : (
                                            <Star size={14} className="text-muted" />
                                        )}
                                    </div>

                                    <FileEarmarkText className="me-2 text-primary" size={18} />
                                    <span className={`text-truncate fw-semibold ${textColor}`}>{file.originalName}</span>
                                </Col>

                                <Col xs={2} className="text-muted text-truncate small">{file.path || '/uploads/root'}</Col>
                                <Col xs={1} className="text-muted small">{(file.size / 1024).toFixed(1)} KB</Col>
                                <Col xs={2} className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    <ClockHistory size={12} className="me-1" />
                                    {new Date(file.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </Col>
                                <Col xs={1}>
                                    <Badge style={{ backgroundColor: '#0d6efd', color: 'white', padding: '5px 12px', borderRadius: '15px', fontWeight: '500', fontSize: '0.7rem' }}>
                                        {file.username || 'admin'}
                                    </Badge>
                                </Col>
                                <Col xs={1} className="text-center">
                                    <div className="d-flex justify-content-center gap-2">
                                        <Eye size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => handleViewFile(file)} />
                                        <Trash size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => handleDelete(file._id, file.originalName)} />
                                    </div>
                                </Col>
                            </Row>
                        ))
                    ) : (
                        <div className={`text-center py-5 text-muted ${isDarkMode ? 'bg-dark' : 'bg-white'} border rounded`}>No matching logs found.</div>
                    )}
=======
                    {filteredFiles.map((file, index) => (
                        <Row key={file._id} className="align-items-center px-3 py-3 mx-0 border-bottom mb-1 rounded" style={{ backgroundColor: itemBg, fontSize: '0.85rem' }}>
                            <Col xs={1} className="text-muted">{index + 1}</Col>
                            <Col xs={4} className="d-flex align-items-center">
                                <FileEarmarkText className="me-3 text-primary" size={18} />
                                <span className={`text-truncate fw-semibold ${textColor}`}>{file.originalName}</span>
                            </Col>
                            <Col xs={2} className="text-muted text-truncate small">{file.path}</Col>
                            <Col xs={1} className="text-muted small">{(file.size / 1024).toFixed(1)} KB</Col>
                            <Col xs={2} className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(file.createdAt).toLocaleDateString()}</Col>
                            <Col xs={1}><Badge bg="primary" pill>{file.username || 'admin'}</Badge></Col>
                            <Col xs={1} className="text-center">
                                <div className="d-flex justify-content-center gap-2">
                                    <Eye size={16} className="text-primary cursor-pointer" onClick={() => handleViewFile(file)} />
                                    
                                    {/* Direct Transfer for Admins */}
                                    {['ADMIN', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase()) && (
                                        <ArrowRightSquare size={16} className="text-success cursor-pointer" onClick={() => handleTransfer(file._id, file.originalName)} />
                                    )}

                                    <Trash size={16} className="text-danger cursor-pointer" onClick={() => handleDelete(file._id, file.originalName)} />
                                </div>
                            </Col>
                        </Row>
                    ))}
>>>>>>> sakshi-features
                </div>
            </div>
        </div>
    );
};

export default FileDashboard;