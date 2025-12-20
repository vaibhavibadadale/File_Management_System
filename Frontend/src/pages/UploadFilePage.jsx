import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Container, Table, Button, Form, Breadcrumb, Row, Col, InputGroup } from 'react-bootstrap';
import { FolderFill, FileEarmarkFill, HouseFill, Upload, PlusSquare, Send, Search, XCircle } from 'react-bootstrap-icons';
import TransferModal from "../components/TransferModal"; 

function UploadFilePage({ currentTheme, user }) {
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [folderName, setFolderName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItems, setSelectedItems] = useState({}); // Tracks both file and folder IDs
    
    const [currentFolderId, setCurrentFolderId] = useState(null); 
    const [path, setPath] = useState([{ _id: null, name: "Home" }]);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    const fileInputRef = useRef(null);

    useEffect(() => { loadData(); }, [currentFolderId, searchTerm]);

    const loadData = async () => {
        try {
            const id = currentFolderId || "null";
            const searchQ = searchTerm ? `&search=${searchTerm}` : "";
            const [fRes, filRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/folders?parentId=${id}${searchQ}`),
                axios.get(`http://localhost:5000/api/files?folderId=${id}${searchQ}`)
            ]);
            setFolders(fRes.data.folders);
            setFiles(filRes.data.files);
        } catch (err) { console.error("Load Error", err); }
    };

    const enterFolder = (folder) => {
        setCurrentFolderId(folder._id);
        setPath([...path, { _id: folder._id, name: folder.name }]);
        setSelectedItems({}); 
        setSearchTerm("");
    };

    const jumpTo = (index) => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        setCurrentFolderId(newPath[newPath.length - 1]._id);
        setSelectedItems({});
        setSearchTerm("");
    };

    const toggleSelect = (id) => {
        setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const selectedCount = Object.values(selectedItems).filter(Boolean).length;

    return (
        <Container fluid className={`p-4 ${currentTheme === 'dark' ? 'bg-dark text-white min-vh-100' : ''}`}>
            <Row className="mb-4 align-items-center">
                <Col md={4}><h3>📂 Drive Manager</h3></Col>
                <Col md={8}>
                    <InputGroup>
                        <InputGroup.Text><Search /></InputGroup.Text>
                        <Form.Control 
                            placeholder="Search..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        {searchTerm && <Button variant="light" onClick={() => setSearchTerm("")}><XCircle /></Button>}
                    </InputGroup>
                </Col>
            </Row>

            <Breadcrumb className="border p-2 bg-light rounded shadow-sm mb-3">
                {path.map((item, index) => (
                    <Breadcrumb.Item key={index} active={index === path.length - 1} onClick={() => jumpTo(index)} style={{ cursor: 'pointer' }}>
                        {index === 0 ? <HouseFill className="me-1"/> : null} {item.name}
                    </Breadcrumb.Item>
                ))}
            </Breadcrumb>

            <div className="d-flex gap-2 mb-4 p-3 bg-white border rounded shadow-sm align-items-center">
                <Form.Control 
                    placeholder="New folder name" 
                    value={folderName || ""} 
                    onChange={(e) => setFolderName(e.target.value)} 
                    style={{width: '200px'}}
                />
                <Button variant="primary" onClick={async () => {
                    if(!folderName) return;
                    await axios.post("http://localhost:5000/api/folders/create", { name: folderName, parentId: currentFolderId });
                    setFolderName(""); loadData();
                }}><PlusSquare /> Create Folder</Button>
                
                {/* Upload Section: Only shows when NOT on the Home Page */}
                {currentFolderId !== null && (
                    <>
                        <div className="vr mx-2"></div>
                        <Button variant="success" onClick={() => fileInputRef.current.click()}><Upload /> Upload File</Button>
                        <input type="file" ref={fileInputRef} hidden onChange={async (e) => {
                            const formData = new FormData();
                            formData.append("file", e.target.files[0]);
                            formData.append("folderId", currentFolderId);
                            await axios.post("http://localhost:5000/api/files/upload", formData);
                            loadData();
                        }} />
                    </>
                )}

                {/* Transfer button pops up when any item is selected */}
                {selectedCount > 0 && (
                    <Button variant="warning" className="ms-auto" onClick={() => setIsTransferModalOpen(true)}>
                        <Send /> Transfer ({selectedCount})
                    </Button>
                )}
            </div>

            <Table hover bordered variant={currentTheme === 'dark' ? 'dark' : ''}>
                <thead className="table-secondary">
                    <tr>
                        <th style={{ width: "60px" }} className="text-center">Select</th>
                        <th>Name</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    {folders.map(f => (
                        <tr key={f._id}>
                            <td className="text-center">
                                <Form.Check 
                                    type="checkbox" 
                                    checked={!!selectedItems[f._id] || false} 
                                    onChange={() => toggleSelect(f._id)} 
                                />
                            </td>
                            <td onDoubleClick={() => enterFolder(f)} style={{ cursor: 'pointer' }} className="text-primary fw-bold">
                                <FolderFill className="text-warning me-2" /> {f.name}
                            </td>
                            <td>Folder</td>
                        </tr>
                    ))}
                    {files.map(file => (
                        <tr key={file._id}>
                            <td className="text-center">
                                <Form.Check 
                                    type="checkbox" 
                                    checked={!!selectedItems[file._id] || false} 
                                    onChange={() => toggleSelect(file._id)} 
                                />
                            </td>
                            <td><FileEarmarkFill className="text-info me-2" /> {file.originalname}</td>
                            <td>File</td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {isTransferModalOpen && (
                <TransferModal 
                    selectedIds={Object.keys(selectedItems).filter(id => selectedItems[id])}
                    senderUsername={user?.username}
                    onClose={() => setIsTransferModalOpen(false)}
                    onSuccess={() => { setSelectedItems({}); setIsTransferModalOpen(false); loadData(); }}
                />
            )}
        </Container>
    );
}

export default UploadFilePage;
