import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, ListGroup, Form, InputGroup } from 'react-bootstrap';
import { Search, ShieldLock, CheckCircleFill } from 'react-bootstrap-icons';

const TransferModal = ({ selectedIds, senderUsername, onClose, onSuccess }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1); 
    const [password, setPassword] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        // Fetch users and filter out the logged-in user
        axios.get("http://localhost:5000/api/users").then(res => {
            const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
            setUsers(data.filter(u => u.username !== senderUsername));
        }).catch(err => console.error("User fetch failed", err));
    }, [senderUsername]);

    const handleTransfer = async () => {
        try {
            // This sends the IDs of both folders and files to the backend
            await axios.post("http://localhost:5000/api/files/transfer", {
                itemIds: selectedIds, 
                recipientId: selectedUser._id, 
                senderUsername, 
                password
            });
            setShowSuccess(true);
            setTimeout(() => onSuccess(), 1500);
        } catch (err) { 
            alert(err.response?.data?.message || "Transfer Failed: Check your password"); 
        }
    };

    if (showSuccess) {
        return (
            <Modal show={true} centered>
                <Modal.Body className="text-center p-5">
                    <CheckCircleFill size={60} className="text-success mb-3 animate__animated animate__zoomIn" />
                    <h4 className="text-success">Transfer Successful!</h4>
                </Modal.Body>
            </Modal>
        );
    }

    return (
        <Modal show={true} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>{step === 1 ? `Transfer ${selectedIds.length} Items` : "Security Check"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {step === 1 ? (
                    <>
                        <InputGroup className="mb-2">
                            <InputGroup.Text><Search /></InputGroup.Text>
                            <Form.Control 
                                placeholder="Search recipient..." 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </InputGroup>
                        <ListGroup style={{maxHeight: '250px', overflowY: 'auto'}}>
                            {users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                                <ListGroup.Item 
                                    key={u._id} 
                                    active={selectedUser?._id === u._id} 
                                    onClick={() => setSelectedUser(u)} 
                                    action
                                >
                                    {u.username}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </>
                ) : (
                    <div className="text-center p-3">
                        <ShieldLock size={40} className="mb-3 text-primary" />
                        <Form.Group>
                            <Form.Label>Confirm your password to send to {selectedUser?.username}</Form.Label>
                            <Form.Control 
                                type="password" 
                                placeholder="Enter password (123)" 
                                onChange={(e) => setPassword(e.target.value)} 
                                autoFocus 
                            />
                        </Form.Group>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                {step === 1 ? (
                    <Button onClick={() => setStep(2)} disabled={!selectedUser} className="w-100">
                        Continue
                    </Button>
                ) : (
                    <div className="d-flex w-100 gap-2">
                        <Button variant="secondary" className="w-50" onClick={() => setStep(1)}>Back</Button>
                        <Button variant="success" className="w-50" onClick={handleTransfer}>Verify & Send</Button>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default TransferModal;