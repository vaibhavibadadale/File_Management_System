import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, ListGroup, Form, InputGroup } from 'react-bootstrap';
import { Search, ShieldLock } from 'react-bootstrap-icons';

const TransferModal = ({ selectedIds, senderUsername, onClose, onSuccess }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1); 
    const [password, setPassword] = useState("");

    useEffect(() => {
        axios.get("http://localhost:5000/api/users")
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
                setUsers(data);
            })
            .catch(err => console.error(err));
    }, []);

    const handleTransfer = async () => {
        const recipientId = selectedUser?._id; 
        if (!recipientId) return alert("Please select a recipient.");

        try {
            const response = await axios.post("http://localhost:5000/api/transfer/secure-send", {
                senderUsername: senderUsername, 
                password: password,
                recipientId: recipientId, 
                fileIds: selectedIds 
            });
            
            alert(response.data.message); 
            onSuccess();
        } catch (err) {
            alert(err.response?.data?.message || "Transfer failed.");
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>{step === 1 ? `Transfer Selected (${selectedIds.length})` : "Security Check"}</Modal.Title>
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
                           {users
                            .filter(u => 
                                (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) && 
                                u.username !== senderUsername // FILTER: Cannot send to self
                            )
                            .map(u => (
                                <ListGroup.Item 
                                    key={u._id} 
                                    active={selectedUser?._id === u._id} 
                                    onClick={() => setSelectedUser(u)} 
                                    action
                                >
                                    {u.name || "Unknown User"} 
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </>
                ) : (
                    <div className="text-center p-3">
                        <ShieldLock size={40} className="mb-3 text-primary" />
                        <Form.Group>
                            <Form.Label>Confirm password to send to <strong>{selectedUser?.name}</strong></Form.Label>
                            <Form.Control
                                type="password" 
                                placeholder="Enter password" 
                                onChange={(e) => setPassword(e.target.value)} 
                                autoFocus 
                            />
                        </Form.Group>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                {step === 1 ? (
                    <Button onClick={() => setStep(2)} disabled={!selectedUser} className="w-100">Continue</Button>
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