import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Badge, Row, Col, Spinner, Card } from 'react-bootstrap';
import { Eye, FileEarmarkText, BookmarkStarFill, ArrowLeftRight, Database, Activity } from 'react-bootstrap-icons'; 
import '../styles/FileDashboard.css';
import '../styles/VenturesPage.css'; 

const BACKEND_URL = "http://localhost:5000"; 

const FileDashboard = ({ user, currentTheme }) => { 
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const isDarkMode = currentTheme === 'dark';

    const theme = {
        textMain: isDarkMode ? '#ffffff' : '#212529',
        textMuted: isDarkMode ? '#a0a0a0' : '#6c757d',
        cardBg: isDarkMode ? '#212529' : '#ffffff',
        border: isDarkMode ? '#383838' : '#f0f0f0',
        wrapperBg: isDarkMode ? '#121212' : '#f8f9fa'
    };

    const fetchData = useCallback(async () => {
        if (!user?._id) return; 
        try {
            // Fetching files directly to get accurate counts
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
        if (!file.filename) return;
        try {
            await axios.post(`${BACKEND_URL}/api/files/track-view`, { 
                fileId: file._id, 
                userId: user?._id 
            });
            const ownerName = file.username || file.uploadedByUsername || "Admin";
            window.open(`${BACKEND_URL}/uploads/${ownerName}/${encodeURIComponent(file.filename)}`, '_blank');
            fetchData(); 
        } catch (err) {
            const ownerName = file.username || file.uploadedByUsername || "Admin";
            window.open(`${BACKEND_URL}/uploads/${ownerName}/${encodeURIComponent(file.filename)}`, '_blank');
        }
    };

    // Calculate stats based on fetched data
    const stats = useMemo(() => {
        // Filter to count only files belonging to this user or department
        const totalFiles = uploadedFiles.length;
        const totalSize = uploadedFiles.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
        
        // Count starred files (matches star logic in UploadFilePage)
        const impCount = uploadedFiles.filter(f => 
            Array.isArray(f.isStarred) ? f.isStarred.includes(user?._id) : f.isStarred
        ).length;

        return { 
            totalFiles, 
            totalMB: (totalSize / (1024 * 1024)).toFixed(2), 
            impCount 
        };
    }, [uploadedFiles, user?._id]);

    const recentlyViewed = useMemo(() => {
        return [...uploadedFiles]
            .filter(f => f.lastViewedAt) 
            .sort((a, b) => new Date(b.lastViewedAt) - new Date(a.lastViewedAt))
            .slice(0, 8);
    }, [uploadedFiles]);

    const recentlyTransferred = useMemo(() => {
        return [...uploadedFiles]
            .filter(f => f.transferStatus === 'received')
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 8);
    }, [uploadedFiles]);

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className={`dashboard-wrapper pb-5 ${isDarkMode ? 'bg-dark' : ''}`} 
             style={{ backgroundColor: theme.wrapperBg, minHeight: '100vh', color: theme.textMain }}> 
            
            <div className="container-fluid px-4 pt-3">
                <h3 className={`mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>File Dashboard</h3>

                <Row className="mb-4 g-3">
                    {[
                        { label: 'My Total Files', val: stats.totalFiles, icon: <Database/>, color: 'primary' },
                        { label: 'My Storage', val: `${stats.totalMB} MB`, icon: <Activity/>, color: 'success' },
                        { label: 'Important', val: stats.impCount, icon: <BookmarkStarFill/>, color: 'warning' }
                    ].map((card, i) => (
                        <Col key={i} md={4}>
                            <Card className={`border-0 shadow-sm p-3 ${isDarkMode ? 'bg-dark border border-secondary' : ''}`} 
                                  style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff', color: theme.textMain }}>
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

                <Row className="g-4 align-items-stretch">
                    <Col lg={8} className="d-flex">
                        <Card className={`border-0 shadow-sm w-100 ${isDarkMode ? 'bg-dark border border-secondary' : ''}`} 
                              style={{ backgroundColor: theme.cardBg }}>
                            <Card.Header className={`bg-transparent border-0 pt-3 ${isDarkMode ? 'border-bottom border-secondary' : ''}`}>
                                <h6 className={`fw-bold ${isDarkMode ? 'text-white' : ''}`}><Eye className="me-2 text-primary" /> Recently Viewed</h6>
                            </Card.Header>
                            <Card.Body className="px-0 pt-0">
                                {recentlyViewed.length > 0 ? recentlyViewed.map(file => (
                                    <div key={file._id} className={`d-flex justify-content-between px-3 py-3 border-bottom hover-row ${isDarkMode ? 'border-secondary' : ''}`} 
                                         style={{ cursor: 'pointer', transition: '0.2s' }}
                                         onClick={() => handleViewFile(file)}>
                                        <div className="d-flex align-items-center">
                                            <FileEarmarkText className="me-3 text-primary" size={20} />
                                            <div>
                                                <div className={`fw-semibold small ${isDarkMode ? 'text-white' : 'text-dark'}`}>{file.originalName || file.filename}</div>
                                                <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>
                                                    Viewed: {new Date(file.lastViewedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="small" style={{ color: theme.textMuted }}>{(file.size / 1024).toFixed(0)} KB</div>
                                    </div>
                                )) : <div className="p-5 text-center" style={{ color: theme.textMuted }}>No viewing activity yet.</div>}
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4} className="d-flex">
                        <Card className={`border-0 shadow-sm w-100 ${isDarkMode ? 'bg-dark border border-secondary' : ''}`} 
                              style={{ backgroundColor: theme.cardBg }}>
                            <Card.Header className={`bg-transparent border-0 pt-3 ${isDarkMode ? 'border-bottom border-secondary' : ''}`}>
                                <h6 className="fw-bold text-success"><ArrowLeftRight className="me-2" /> Recent Transfers</h6>
                            </Card.Header>
                            <Card.Body className="pt-3">
                                {recentlyTransferred.length > 0 ? recentlyTransferred.map(file => (
                                    <div key={file._id} className={`mb-3 p-2 rounded border hover-row ${isDarkMode ? 'border-secondary bg-dark' : ''}`} 
                                         style={{ cursor: 'pointer' }}
                                         onClick={() => handleViewFile(file)}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className={`fw-semibold small text-truncate ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ maxWidth: '70%' }}>{file.originalName || file.filename}</span>
                                            <Badge bg="info" style={{ fontSize: '0.6rem' }}>RECEIVED</Badge>
                                        </div>
                                        <div className="mt-1 d-flex justify-content-between" style={{ fontSize: '0.65rem', color: theme.textMuted }}>
                                            <span>From: {file.username || "System"}</span>
                                            <span>{new Date(file.updatedAt || file.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                )) : <div className="text-center py-5 small" style={{ color: theme.textMuted }}>No recent transfers.</div>}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default FileDashboard;