import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Table, Button, Alert, Form, Navbar, Nav, Container, FormControl } from 'react-bootstrap';
import { Trash, Eye, Pencil, Moon, Sun, PersonCircle } from 'react-bootstrap-icons'; 

const BACKEND_URL = "http://localhost:5000"; 

const FileDashboard = ({ currentTheme, onThemeToggle }) => { 
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(''); 
    const [searchTerm, setSearchTerm] = useState(''); 
    
    const isDarkMode = currentTheme === 'dark';
    const textColor = isDarkMode ? 'text-light' : 'text-dark';

    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BACKEND_URL}/api/files`); 
            const fileData = response.data.files || response.data || [];
            setUploadedFiles(Array.isArray(fileData) ? fileData : []);
        } catch (err) {
            setError(`Failed to load files.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // --- RESTORED EDIT HANDLER ---
    const handleEditFile = async (file) => {
        const newName = prompt("Enter new name for the file:", file.originalname);
        if (newName && newName !== file.originalname) {
            try {
                await axios.put(`${BACKEND_URL}/api/files/${file._id}`, { newName });
                setMessage(`File renamed to ${newName}`);
                fetchFiles(); // Refresh the list to show the new name
            } catch (err) {
                setMessage("Error renaming file");
            }
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (window.confirm(`Delete ${fileName}?`)) {
            try {
                await axios.delete(`${BACKEND_URL}/api/files/${fileId}`);
                setMessage("File deleted");
                fetchFiles();
            } catch (err) {
                setMessage("Error deleting file");
            }
        }
    };

    const handleViewFile = (file) => {
        let correctedPath = file.path?.replace(/\\/g, '/');
        window.open(`${BACKEND_URL}/uploads/${correctedPath}`, '_blank'); 
    };

    const filteredFiles = uploadedFiles.filter((file) => 
        (file.originalname || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={isDarkMode ? "bg-dark min-vh-100" : ""}> 
            <Navbar bg={isDarkMode ? "dark" : "light"} variant={currentTheme} expand="lg" className="shadow-sm">
                <Container fluid>
                    <Navbar.Brand className={textColor}>📁 File Dashboard</Navbar.Brand>
                    <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                        <Form className="d-flex me-3"> 
                            <FormControl
                                type="search"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '400px' }} 
                            />
                        </Form>
                        <Button variant="link" onClick={onThemeToggle} className={textColor}>
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </Button>
                        <Nav.Link href="#" className={textColor}><PersonCircle size={24} /></Nav.Link>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <div className="container mt-4">
                {message && <Alert variant="success" onClose={() => setMessage('')} dismissible>{message}</Alert>}
                
                <h3 className={`mb-3 ${textColor}`}>File List</h3>

                <Table striped bordered hover responsive variant={isDarkMode ? 'dark' : 'light'}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>File Name</th>
                            <th>Size (KB)</th>
                            <th>Uploaded By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFiles.map((file, index) => (
                            <tr key={file._id}>
                                <td>{index + 1}</td>
                                <td>{file.originalname}</td>
                                <td>{(file.size / 1024).toFixed(2)}</td>
                                <td>{file.uploadedBy || "Admin"}</td>
                                <td>
                                    <div className="d-flex flex-nowrap"> 
                                        {/* VIEW */}
                                        <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleViewFile(file)} title="View">
                                            <Eye />
                                        </Button>
                                        
                                        {/* RESTORED EDIT BUTTON */}
                                        <Button variant="outline-info" size="sm" className="me-1" onClick={() => handleEditFile(file)} title="Edit">
                                            <Pencil />
                                        </Button>

                                        {/* DELETE */}
                                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(file._id, file.originalname)} title="Delete">
                                            <Trash />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </div>
    );
};

export default FileDashboard;