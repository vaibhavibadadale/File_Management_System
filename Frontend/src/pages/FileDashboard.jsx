import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Table, Button, Alert, Form, Navbar, Nav, Container, FormControl } from 'react-bootstrap';
import { Trash, Eye, Pencil, Search, Moon, Sun, PersonCircle } from 'react-bootstrap-icons'; 

// NOTE: Ensure your BACKEND_URL matches your server's address.
const BACKEND_URL = "http://localhost:5000"; 

const FileDashboard = ({ currentTheme, onThemeToggle }) => { 
    // --- STATE MANAGEMENT ---
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(''); 
    const [searchTerm, setSearchTerm] = useState(''); 
    
    const isDarkMode = currentTheme === 'dark';
    const textColor = isDarkMode ? 'text-light' : 'text-dark';

    // --- DATA FETCHING (Assumed existing implementation) ---
    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${BACKEND_URL}/api/files`); 
            if (response.data.success && Array.isArray(response.data.files)) {
                setUploadedFiles(response.data.files);
            } else {
                setUploadedFiles([]);
            }
        } catch (err) {
            console.error("Error fetching files:", err);
            setError(`Failed to load files from server. Check backend URL or server status.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // --- FILTERED FILES DEFINITION ---
    const filteredFiles = uploadedFiles.filter((file) => {
        if (!file || !file.originalname) return false;
        const currentSearchTerm = searchTerm || "";
        return file.originalname.toLowerCase().includes(currentSearchTerm.toLowerCase());
    });
    
    
    // --- ACTION HANDLERS ---

    // 1. VIEW FILE (Opens file in new tab)
    const handleViewFile = (file) => {
        // 1. Start with the raw path from the database
        let correctedPath = file.path;
        
        // 2. CRITICAL FIX: Normalize path separators: Replace all backslashes (\) with forward slashes (/)
        if (correctedPath) {
            correctedPath = correctedPath.replace(/\\/g, '/');
        }
        
        // 3. Construct the final URL: Backend URL + Static Route + Normalized Path
        // This structure resolves the "Cannot GET" error.
        const fileUrl = `${BACKEND_URL}/uploads/${correctedPath}`;
        
        window.open(fileUrl, '_blank'); 
        setMessage(`Opening file: ${file.originalname}`);
    };

    // 2. EDIT FILE (Renaming/Metadata) (Assumed existing implementation)
    const handleEditFile = async (file) => { /* ... */ };

    // 3. DELETE FILE (Assumed existing implementation)
    const handleDelete = async (fileId, fileName) => { /* ... */ };
    
    // --- CONDITIONAL RENDERS ---
    if (loading) return <div className={`container mt-4 ${textColor}`}><p>Loading files...</p></div>;
    if (error) return <div className={`container mt-4 text-danger`}><p>Error: {error}</p></div>;

    // --- MAIN RENDER ---
    return (
        <div> 
            
            {/* HEADER/NAVBAR SECTION */}
            <Navbar bg={isDarkMode ? "dark" : "light"} variant={currentTheme} expand="lg" className="shadow-sm">
                <Container fluid>
                    <Navbar.Brand><span className={textColor}></span></Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    
                    <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                        <Nav className="me-auto"></Nav> 
                        
                        {/* 1. Search Bar - With increased width (400px) */}
                        <Form className="d-flex me-3"> 
                            <FormControl
                                type="search"
                                placeholder="Search files..."
                                aria-label="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '400px' }} 
                            />
                        </Form>
                        
                        {/* 2. Theme Toggle */}
                        <Button variant="link" onClick={onThemeToggle} className={textColor} title="Toggle Theme">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </Button>
                        
                        {/* 3. User Profile */}
                        <Nav.Link href="#" className={textColor} title="User Profile">
                            <PersonCircle size={24} />
                        </Nav.Link>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            {/* END HEADER/NAVBAR */}

            {/* Content Container */}
            <div className={`container mt-4`}>
                {/* Status messages display */}
                {message && (
                    <Alert 
                        variant={message.includes('Error') || message.includes('cancelled') ? 'warning' : 'success'} 
                        onClose={() => setMessage('')} 
                        dismissible
                    >
                        {message}
                    </Alert>
                )}
                
                <h3 className={`mb-3 ${textColor}`}>File List</h3>

                <Table striped bordered hover responsive variant={isDarkMode ? 'dark' : 'light'} className="mt-3">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>File Name</th>
                            <th>Path / Location</th> 
                            <th>Size (KB)</th>
                            <th>Uploaded By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFiles.length > 0 ? (
                            filteredFiles.map((file, index) => (
                                <tr key={file._id}>
                                    <td>{index + 1}</td>
                                    <td>{file.originalname}</td>
                                    <td>{file.fullDisplayName || 'N/A'}</td> 
                                    <td>{(file.size / 1024).toFixed(2)}</td>
                                    <td>{file.uploadedBy}</td>
                                    <td>
                                        {/* FIX: Forces buttons to stay horizontal and uses tighter spacing */}
                                        <div className="d-flex flex-nowrap justify-content-start"> 
                                            
                                            {/* VIEW BUTTON */}
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="me-1" 
                                                onClick={() => handleViewFile(file)} 
                                                title="View File"
                                            >
                                                <Eye />
                                            </Button>
                                            
                                            {/* EDIT BUTTON */}
                                            <Button 
                                                variant="outline-info" 
                                                size="sm" 
                                                className="me-1" 
                                                onClick={() => handleEditFile(file)} 
                                                title="Rename/Edit Metadata"
                                            >
                                                <Pencil /> 
                                            </Button>
                                            
                                            {/* DELETE BUTTON */}
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm" 
                                                onClick={() => handleDelete(file._id, file.originalname)} 
                                                title="Delete File"
                                            >
                                                <Trash />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center text-muted">
                                    No files found matching "{searchTerm}".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </div>
    );
};

export default FileDashboard;