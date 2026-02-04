import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Spinner, FormControl } from 'react-bootstrap';
import { StarFill, FileEarmarkText, Search, FolderFill } from 'react-bootstrap-icons';
import { fetchStarredItemsApi, toggleStarApi } from '../services/apiService';

const ImportantFilesPage = ({ currentTheme, user }) => {
    const [data, setData] = useState({ files: [], folders: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const isDarkMode = currentTheme === 'dark';
    const textColor = isDarkMode ? 'text-light' : 'text-dark';
    const itemBg = isDarkMode ? '#2c2c2c' : '#ffffff';
    const headerBg = isDarkMode ? '#f8f9fa' : '#f1f3f4';

    const loadStarred = useCallback(async () => {
        // The 404 often happens if user._id is missing or the URL is wrong
        if (!user?._id) return;
        setLoading(true);
        try {
            const result = await fetchStarredItemsApi(user._id);
            setData({
                files: result.files || [],
                folders: result.folders || []
            });
        } catch (err) {
            console.error("Error loading starred items:", err);
        } finally {
            setLoading(false); 
        }
    }, [user?._id]);

    useEffect(() => {
        loadStarred();
    }, [loadStarred]);

    const handleUnstar = async (itemId, type = 'files') => { 
        try {
            await toggleStarApi(itemId, type, false, user._id);
            setData(prev => ({
                ...prev,
                [type]: prev[type].filter(item => item._id !== itemId)
            }));
        } catch (err) {
            console.error("Failed to unstar:", err);
            alert("Could not remove from important list.");
        }
    };

    const handleItemClick = (item) => {
        if (item.path) {
            // Ensure this URL matches your backend's static file serving path
            const fileUrl = `http://localhost:5000/${item.path.replace(/\\/g, '/')}`;
            window.open(fileUrl, '_blank');
        }
    };

    const filteredFiles = data.files.filter(file => 
        file.originalName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFolders = data.folders.filter(folder => 
        folder.folderName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
    <div className="container-fluid px-4" style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }}>
        
        {/* --- TIGHTEST TOP MARGIN --- */}
        <div className="pt-0 mt-1 mb-3"> 
            <h3 
                className="mb-3" 
                style={{ 
                    fontSize: '27.4px', 
                    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontWeight: '600',
                    color: isDarkMode ? '#fff' : '#212529',
                    margin: '0',
                    lineHeight: '1.2'
                }}
            >
                Important Files
            </h3>

            <div className="position-relative w-100">
                <Search className="position-absolute top-50 translate-middle-y ms-3 text-muted" size={16} />
                <FormControl 
                    type="text" 
                    placeholder="Search your starred files..." 
                    className="ps-5 py-2 rounded shadow-sm border-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                        backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', 
                        color: isDarkMode ? '#fff' : '#000',
                        fontSize: '0.9rem'
                    }}
                />
            </div>
        </div>

        {/* --- TABLE HEADER --- */}
        <Row className="px-3 py-2 text-uppercase fw-bold text-muted border-bottom mx-0 mb-2" style={{ fontSize: '0.75rem', backgroundColor: headerBg }}>
            <Col xs={6}>Name</Col>
            <Col xs={2}>Type</Col>
            <Col xs={2}>Date</Col>
            <Col xs={2}>Size</Col>
        </Row>

            <div className="starred-container">
                {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                    <div className="text-center py-5 text-muted">No important items found.</div>
                ) : (
                    <>
                        {filteredFolders.map((folder) => (
                            <Row 
                                key={folder._id} 
                                onClick={() => handleItemClick(folder)}
                                className="align-items-center px-3 py-2 mx-0 border-bottom mb-1" 
                                style={{ backgroundColor: itemBg, fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <Col xs={6} className="d-flex align-items-center">
                                    <FolderFill className="me-2 text-warning" size={18} />
                                    <span className={`text-truncate ${textColor} me-2`}>{folder.folderName}</span>
                                    <StarFill 
                                        className="text-warning" 
                                        size={14} 
                                        onClick={(e) => { e.stopPropagation(); handleUnstar(folder._id, 'folders'); }} 
                                    />
                                </Col>
                                <Col xs={2} className="text-muted">FOLDER</Col>
                                <Col xs={2} className="text-muted">
                                    {new Date(folder.updatedAt || folder.createdAt).toLocaleDateString('en-GB')}
                                </Col>
                                <Col xs={2} className="text-muted">--</Col>
                            </Row>
                        ))}

                        {filteredFiles.map((file) => (
                            <Row 
                                key={file._id} 
                                onClick={() => handleItemClick(file)}
                                className="align-items-center px-3 py-2 mx-0 border-bottom mb-1" 
                                style={{ backgroundColor: itemBg, fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <Col xs={6} className="d-flex align-items-center">
                                    <FileEarmarkText className="me-2 text-primary" size={18} />
                                    <span className={`text-truncate ${textColor} me-2`}>{file.originalName}</span>
                                    <StarFill 
                                        className="text-warning" 
                                        size={14} 
                                        onClick={(e) => { e.stopPropagation(); handleUnstar(file._id, 'files'); }} 
                                    />
                                </Col>
                                <Col xs={2} className="text-muted text-uppercase">
                                    {file.originalName?.split('.').pop() || 'FILE'}
                                </Col>
                                <Col xs={2} className="text-muted">
                                    {new Date(file.updatedAt || file.createdAt).toLocaleDateString('en-GB')}
                                </Col>
                                <Col xs={2} className="text-muted">
                                    {file.size > 1024 * 1024 
                                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                                        : `${(file.size / 1024).toFixed(1)} KB`}
                                </Col>
                            </Row>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default ImportantFilesPage;