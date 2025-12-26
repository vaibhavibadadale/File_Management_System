import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Button, Form, FormControl, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { 
    Trash, 
    Eye, 
    ClockHistory, 
    FileEarmarkText, 
    ArrowClockwise,
    Filter,
    Search,
    X
} from 'react-bootstrap-icons'; 

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
            const response = await axios.get(`${BACKEND_URL}/api/files`); 
            if (response.data.success && Array.isArray(response.data.files)) {
                setUploadedFiles(response.data.files);
            }
        } catch (err) {
            console.error(`Failed to load activity logs.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    const uniqueUsers = useMemo(() => {
        const users = uploadedFiles.map(f => f.username || 'admin');
        return ['All', ...new Set(users)];
    }, [uploadedFiles]);

    const filteredFiles = uploadedFiles.filter((file) => {
        const matchesName = file.originalName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = userFilter === 'All' || (file.username || 'admin') === userFilter;
        return matchesName && matchesUser;
    });

    const handleViewFile = (file) => {
        if (!file.path) return;
        const finalPath = file.path.startsWith('/uploads') ? file.path : `/uploads/${file.path}`;
        window.open(`${BACKEND_URL}${finalPath.replace(/\\/g, '/')}`, '_blank'); 
    };

    const handleDelete = async (fileId, fileName) => {
        if (window.confirm(`Delete ${fileName}?`)) {
            try {
                await axios.delete(`${BACKEND_URL}/api/files/${fileId}`, { data: { userId: user?._id } });
                fetchFiles();
            } catch (err) { alert("Delete failed."); }
        }
    };

    if (loading) return <div className="p-5 text-center"><Spinner animation="grow" variant="primary" /></div>;

    return (
        <div className="pb-5" style={{ 
            minHeight: '100vh', 
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}> 
            
            <div className="container-fluid pt-4 px-4">
                
                {/* --- TOP TITLE --- */}
                <div className="mb-4">
                    <h4 className={`fw-bold mb-0 ${textColor}`}>Activity Monitor</h4>
                </div>

                {/* --- CONTROLS SECTION: Search logs placed at bottom right of header --- */}
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h5 className={`${textColor} fw-bold mb-0`}>Recent Activity Logs</h5>
                        <p className="text-muted small mb-0">Overview of recent system uploads</p>
                    </div>
                    
                    <div className="d-flex align-items-center gap-2">
                        {/* Search Bar moved here (Right side of Recent Activity Logs) */}
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
                                    backgroundColor: isDarkMode ? '#2c2c2c' : '#fff'
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

                        {/* Filter Dropdown */}
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

                        {/* Refresh Button */}
                        <Button variant="outline-primary" size="sm" onClick={fetchFiles} className="rounded-pill px-3 shadow-sm border-0 bg-white text-primary fw-bold" style={{ height: '35px', fontSize: '0.8rem' }}>
                            <ArrowClockwise className="me-1" /> Refresh
                        </Button>
                    </div>
                </div>

                {/* --- TABLE HEADER --- */}
                <Row className="px-3 py-2 text-uppercase fw-bold text-muted border-bottom mx-0 mb-2 rounded" style={{ fontSize: '0.65rem', backgroundColor: headerBg, letterSpacing: '0.5px' }}>
                    <Col xs={1}>#</Col>
                    <Col xs={4}>Files Uploaded By</Col>
                    <Col xs={2}>Internal Path</Col>
                    <Col xs={1}>File Size</Col>
                    <Col xs={2}>Log Date & Time</Col>
                    <Col xs={1}>User</Col>
                    <Col xs={1} className="text-center">Action</Col>
                </Row>

                {/* --- DATA ROWS --- */}
                <div className="activity-list">
                    {filteredFiles.length > 0 ? (
                        filteredFiles.map((file, index) => (
                            <Row 
                                key={file._id} 
                                className="align-items-center px-3 py-3 mx-0 border-bottom mb-1 rounded bg-white" 
                                style={{ 
                                    backgroundColor: itemBg, 
                                    fontSize: '0.85rem',
                                    border: isDarkMode ? '1px solid #333' : '1px solid #eee'
                                }}
                            >
                                <Col xs={1} className="text-muted small">{index + 1}</Col>
                                <Col xs={4} className="d-flex align-items-center overflow-hidden">
                                    <FileEarmarkText className="me-3 text-primary" size={18} />
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
                </div>
            </div>
        </div>
    );
};

export default FileDashboard;