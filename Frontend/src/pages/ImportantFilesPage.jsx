import React, { useState, useEffect } from 'react';
import { Row, Col, Spinner, Form, FormControl } from 'react-bootstrap';
import { StarFill, FileEarmarkText, Trash, Search, Eye, FolderFill } from 'react-bootstrap-icons';
import { fetchStarredItemsApi, toggleStarApi } from '../services/apiService';

const ImportantFilesPage = ({ currentTheme }) => {
    const [data, setData] = useState({ files: [], folders: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Theme Logic
    const isDarkMode = currentTheme === 'dark';
    const textColor = isDarkMode ? 'text-light' : 'text-dark';
    const itemBg = isDarkMode ? '#2c2c2c' : '#ffffff';
    const headerBg = isDarkMode ? '#333' : '#f1f3f4';

    const loadStarred = async () => {
        try {
            setLoading(true);
            const starredData = await fetchStarredItemsApi();
            setData(starredData || { files: [], folders: [] });
        } catch (err) {
            console.error("Failed to load starred items", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStarred();
    }, []);

    const handleUnstar = async (id, type) => {
        try {
            // Optimistic update: UI reacts immediately
            setData(prev => ({
                files: type === 'files' ? prev.files.filter(f => f._id !== id) : prev.files,
                folders: type === 'folders' ? prev.folders.filter(f => f._id !== id) : prev.folders
            }));
            await toggleStarApi(id, type, false);
        } catch (err) {
            console.error("Error unstarring item", err);
            loadStarred(); 
        }
    };

    // Filter Logic
    const filteredFiles = data.files.filter(file => 
        file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFolders = data.folders.filter(folder => 
        folder.folderName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="container-fluid pt-4 px-4" style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }}>
            
            {/* --- HEADER: ONLY TITLE AND SEARCH BAR --- */}
            <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                    <StarFill className="text-warning me-2" size={24} />
                    <h4 className={`fw-bold mb-0 ${textColor}`}>Important Files</h4>
                </div>

                <div className="position-relative w-100">
                    <Search className="position-absolute top-50 translate-middle-y ms-3 text-muted" style={{ zIndex: 5 }} size={16} />
                    <FormControl 
                        type="text" 
                        placeholder="Search your starred files and folders..." 
                        className="ps-5 py-2 rounded shadow-sm border-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', 
                            color: isDarkMode ? '#fff' : '#000' 
                        }}
                    />
                </div>
            </div>

            {/* --- LIST TABLE HEADER --- */}
            <Row className="px-3 py-2 text-uppercase fw-bold text-muted border-bottom mx-0 mb-2" style={{ fontSize: '0.75rem', backgroundColor: headerBg }}>
                <Col xs={1}></Col>
                <Col xs={5}>Name</Col>
                <Col xs={1}>Type</Col>
                <Col xs={2}>Date</Col>
                <Col xs={1}>Size</Col>
                <Col xs={2} className="text-center">Action</Col>
            </Row>

            {/* --- STARRED ITEMS LIST --- */}
            <div className="starred-container">
                {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                    <div className="text-center py-5 text-muted">No matching important items found.</div>
                ) : (
                    <>
                        {/* Folders */}
                        {filteredFolders.map((folder) => (
                            <Row key={folder._id} className="align-items-center px-3 py-2 mx-0 border-bottom mb-1 rounded shadow-sm" style={{ backgroundColor: itemBg, fontSize: '0.85rem' }}>
                                <Col xs={1}><Form.Check type="checkbox" /></Col>
                                <Col xs={5} className="d-flex align-items-center">
                                    <FolderFill className="me-2 text-warning" size={18} />
                                    <span className={`text-truncate fw-medium ${textColor} me-2`}>{folder.folderName}</span>
                                    <StarFill className="text-warning" size={14} style={{ cursor: 'pointer' }} onClick={() => handleUnstar(folder._id, 'folders')} />
                                </Col>
                                <Col xs={1} className="text-muted small">FOLDER</Col>
                                <Col xs={2} className="text-muted small">{new Date(folder.updatedAt || folder.createdAt).toLocaleDateString('en-GB')}</Col>
                                <Col xs={1} className="text-muted small">--</Col>
                                <Col xs={2} className="text-center">
                                    <div className="d-flex justify-content-center gap-3">
                                        <Eye size={16} className="text-primary" style={{ cursor: 'pointer' }} />
                                        <Trash size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => handleUnstar(folder._id, 'folders')} />
                                    </div>
                                </Col>
                            </Row>
                        ))}

                        {/* Files */}
                        {filteredFiles.map((file) => (
                            <Row key={file._id} className="align-items-center px-3 py-2 mx-0 border-bottom mb-1 rounded shadow-sm" style={{ backgroundColor: itemBg, fontSize: '0.85rem' }}>
                                <Col xs={1}><Form.Check type="checkbox" /></Col>
                                <Col xs={5} className="d-flex align-items-center">
                                    <FileEarmarkText className="me-2 text-primary" size={18} />
                                    <span className={`text-truncate fw-medium ${textColor} me-2`}>{file.originalName}</span>
                                    <StarFill className="text-warning" size={14} style={{ cursor: 'pointer' }} onClick={() => handleUnstar(file._id, 'files')} />
                                </Col>
                                <Col xs={1} className="text-muted small text-uppercase">{file.originalName.split('.').pop()}</Col>
                                <Col xs={2} className="text-muted small">{new Date(file.updatedAt || file.createdAt).toLocaleDateString('en-GB')}</Col>
                                <Col xs={1} className="text-muted small">
                                    {file.size > 1024 * 1024 
                                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                                        : `${(file.size / 1024).toFixed(1)} KB`}
                                </Col>
                                <Col xs={2} className="text-center">
                                    <div className="d-flex justify-content-center gap-3">
                                        <Eye size={16} className="text-primary" style={{ cursor: 'pointer' }} />
                                        <Trash size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => handleUnstar(file._id, 'files')} />
                                    </div>
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