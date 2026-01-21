import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Badge, Row, Col, Spinner, Card } from 'react-bootstrap';
import { Eye, FileEarmarkText, BookmarkStarFill, ArrowLeftRight, Database, Activity } from 'react-bootstrap-icons'; 
import '../styles/FileDashboard.css';

const BACKEND_URL = "http://localhost:5000"; 

const FileDashboard = ({ user, currentTheme }) => { 
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const isDarkMode = currentTheme === 'dark';

    const theme = {
        textMain: isDarkMode ? '#f8f9fa' : '#212529',
        textMuted: isDarkMode ? '#ced4da' : '#6c757d',
        cardBg: isDarkMode ? '#2c2c2e' : '#ffffff',
        border: isDarkMode ? '#444446' : '#f0f0f0',
        wrapperBg: isDarkMode ? '#1c1c1e' : '#f8f9fa'
    };

    const fetchData = useCallback(async () => {
        if (!user?._id) return; 
        try {
            setLoading(true);
            const response = await axios.get(`${BACKEND_URL}/api/files?all=true&userId=${user._id}`);
            if (response.data.success) {
                setUploadedFiles(response.data.files);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleViewFile = async (file) => {
        if (!file.path) return;
        try {
            await axios.post(`${BACKEND_URL}/api/files/track-view`, { 
                fileId: file._id, 
                userId: user?._id 
            });
            const finalPath = file.path.startsWith('/uploads') ? file.path : `/uploads/${file.path}`;
            window.open(`${BACKEND_URL}${finalPath.replace(/\\/g, '/')}`, '_blank');
            fetchData();
        } catch (err) {
            console.error("Error opening file:", err);
        }
    };

    const stats = useMemo(() => {
        const totalFiles = uploadedFiles.length;
        const totalSize = uploadedFiles.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
        const impCount = uploadedFiles.filter(f => f.isStarred).length;
        
        return {
            totalFiles,
            totalMB: (totalSize / (1024 * 1024)).toFixed(2),
            impCount
        };
    }, [uploadedFiles]);

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="dashboard-wrapper pb-5" style={{ backgroundColor: theme.wrapperBg, minHeight: '100vh', color: theme.textMain }}> 
            <div className="container-fluid px-4 pt-3">
                
                {/* Metric Cards */}
                <Row className="mb-4 g-3">
                    {[
                        { label: 'My Total Files', val: stats.totalFiles, icon: <Database/>, color: 'primary' },
                        { label: 'My Storage', val: `${stats.totalMB} MB`, icon: <Activity/>, color: 'success' },
                        { label: 'Important', val: stats.impCount, icon: <BookmarkStarFill/>, color: 'warning' }
                    ].map((card, i) => (
                        <Col key={i} md={4}>
                            <Card className="border-0 shadow-sm p-3" style={{ backgroundColor: theme.cardBg }}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="small fw-bold text-uppercase" style={{ color: theme.textMuted }}>{card.label}</div>
                                        <h3 className="fw-bold mb-0">{card.val}</h3>
                                    </div>
                                    <div className={`icon-circle bg-${card.color}-soft text-${card.color}`}>{card.icon}</div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Main Content Area */}
                <Row className="g-4 align-items-stretch">
                    {/* LEFT COLUMN: RECENTLY VIEWED */}
                    <Col lg={8} className="d-flex">
                        <Card className="border-0 shadow-sm w-100" style={{ backgroundColor: theme.cardBg }}>
                            <Card.Header className="bg-transparent border-0 pt-3">
                                <h6 className="fw-bold" style={{ color: theme.textMain }}><Eye className="me-2 text-primary" /> My Recently Viewed</h6>
                            </Card.Header>
                            <Card.Body className="px-0 pt-0">
                                {uploadedFiles.length > 0 ? uploadedFiles.slice(0, 8).map(file => (
                                    <div 
                                        key={file._id} 
                                        className="d-flex justify-content-between px-3 py-3 border-bottom hover-row" 
                                        style={{ borderColor: theme.border, cursor: 'pointer' }}
                                        onClick={() => handleViewFile(file)}
                                    >
                                        <div className="d-flex align-items-center">
                                            <FileEarmarkText className="me-3 text-primary" size={20} />
                                            <div>
                                                {/* Consistent Font: fw-semibold small */}
                                                <div className="fw-semibold small" style={{ color: theme.textMain }}>{file.originalName}</div>
                                                <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>
                                                    Accessed: {new Date(file.lastViewedAt || file.updatedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="small" style={{ color: theme.textMuted }}>{(file.size / 1024).toFixed(0)} KB</div>
                                    </div>
                                )) : <div className="p-4 text-center" style={{ color: theme.textMuted }}>No activity found.</div>}
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* RIGHT COLUMN: RECENT TRANSFERS */}
                    <Col lg={4} className="d-flex">
                        <Card className="border-0 shadow-sm w-100" style={{ backgroundColor: theme.cardBg }}>
                            <Card.Header className="bg-transparent border-0 pt-3">
                                <h6 className="fw-bold text-success"><ArrowLeftRight className="me-2" /> Recent My Transfers</h6>
                            </Card.Header>
                            <Card.Body className="pt-0">
                                {uploadedFiles.length > 0 ? uploadedFiles.slice(0, 8).map(file => (
                                    <div key={file._id} className="mb-3 p-2 rounded border" style={{ borderColor: theme.border }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            {/* Font Matched to Recently Viewed: fw-semibold small */}
                                            <span className="fw-semibold small text-truncate" style={{ color: theme.textMain, maxWidth: '75%' }}>
                                                {file.originalName}
                                            </span>
                                            <Badge bg="success" style={{ fontSize: '0.6rem' }}>DONE</Badge>
                                        </div>
                                        <div className="mt-1" style={{ fontSize: '0.65rem', color: theme.textMuted }}>
                                            {new Date(file.createdAt).toLocaleDateString()} • {(file.size / 1024).toFixed(0)} KB
                                        </div>
                                    </div>
                                )) : <div className="text-center py-5 small" style={{ color: theme.textMuted }}>No transfers found.</div>}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default FileDashboard;