import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Table, Button, Alert, Form, Navbar, Nav, Container, FormControl } from 'react-bootstrap';
import { Trash, Eye, Pencil, Search, Moon, Sun, PersonCircle } from 'react-bootstrap-icons'; 

// NOTE: Ensure your BACKEND_URL matches your server's address.
const BACKEND_URL = "http://localhost:5000"; 

/**
 * FileDashboard component displays a list of uploaded files with search, theme toggle, and actions.
 * Assumes currentTheme and onThemeToggle are passed from a parent component (e.g., App.js).
 */
const FileDashboard = ({ currentTheme, onThemeToggle }) => { 
    // --- STATE MANAGEMENT ---
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(''); 
    const [searchTerm, setSearchTerm] = useState(''); 
    
    // Theme setup based on props
    const isDarkMode = currentTheme === 'dark';
    const textColor = isDarkMode ? 'text-light' : 'text-dark';

    // --- DATA FETCHING ---
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
        const fileUrl = `${BACKEND_URL}/uploads/${file.path}`;
        window.open(fileUrl, '_blank'); 
        setMessage(`Opening file: ${file.originalname}`);
    };

    // 2. EDIT FILE (Renaming/Metadata)
    const handleEditFile = async (file) => {
        const newName = prompt(`Enter new file name (Metadata only):`, file.originalname);
        
        if (!newName) return; 
        
        const trimmedNewName = newName.trim();

        if (trimmedNewName !== file.originalname) {
             try {
                // Requires PUT /api/files/:id endpoint on backend
                const response = await axios.put(`${BACKEND_URL}/api/files/${file._id}`, {
                    originalname: trimmedNewName
                });

                if (response.data.success) {
                    setMessage(`File renamed to '${trimmedNewName}' successfully.`);
                    fetchFiles(); 
                } else {
                    setMessage(`Error renaming file: ${response.data.message || 'Unknown error'}`);
                }
            } catch (err) {
                console.error("Error editing file:", err);
                setMessage(`Error editing file: Failed to connect or server issue.`);
            }
        } else {
            setMessage("File name not changed.");
        }
    };

    // 3. DELETE FILE 
    const handleDelete = async (fileId, fileName) => {
        const isConfirmed = window.confirm(`Are you sure you want to permanently delete the file: "${fileName}"? This action cannot be undone.`);

        if (isConfirmed) {
            try {
                // Requires DELETE /api/files/:id endpoint on backend
                await axios.delete(`${BACKEND_URL}/api/files/${fileId}`);
                
                setMessage(`File "${fileName}" deleted successfully.`);
                fetchFiles(); 
            } catch (err) {
                console.error("Error deleting file:", err);
                setMessage(`Error deleting file: Failed to connect or server issue. Please ensure the backend DELETE route is correctly implemented.`);
            }
        } else {
            setMessage(`Deletion cancelled for file: ${fileName}.`);
        }
    };
    
    // --- CONDITIONAL RENDERS ---
    if (loading) return <div className={`container mt-4 ${textColor}`}><p>Loading files...</p></div>;
    if (error) return <div className={`container mt-4 text-danger`}><p>Error: {error}</p></div>;

    // --- MAIN RENDER ---
    return (
        // 🎯 Layout simplified: Removed redundant layout/theme classes (min-vh-100, bg-dark/light)
        <div> 
            
            {/* HEADER/NAVBAR SECTION - Right-aligned Search, Theme Toggle, User Profile */}
            <Navbar bg={isDarkMode ? "dark" : "light"} variant={currentTheme} expand="lg" className="shadow-sm">
                <Container fluid>
                    {/* Brand/Logo space */}
                    <Navbar.Brand>
                         <span className={textColor}></span> 
                    </Navbar.Brand>
                    
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    
                    {/* CRITICAL: Push content to the right */}
                    <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                        <Nav className="me-auto"></Nav> {/* Pushes following content to the right */}
                        
                        {/* 1. Search Bar - With increased width */}
                        <Form className="d-flex me-3"> 
                            <FormControl
                                type="search"
                                placeholder="Search files..."
                                aria-label="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '500px' }} 
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
                
                {/* Ensure text color is applied to the heading */}
                <h3 className={`mb-3 ${textColor}`}>Uploaded File List</h3>

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
                                        {/* VIEW BUTTON */}
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm" 
                                            className="me-2" 
                                            onClick={() => handleViewFile(file)} 
                                            title="View File"
                                        >
                                            <Eye />
                                        </Button>
                                        
                                        {/* EDIT BUTTON */}
                                        <Button 
                                            variant="outline-info" 
                                            size="sm" 
                                            className="me-2" 
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