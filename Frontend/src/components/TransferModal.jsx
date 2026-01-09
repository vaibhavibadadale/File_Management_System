import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, ListGroup, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Search, ShieldLock, ChatLeftText } from 'react-bootstrap-icons';

// Receive 'user' prop to access role-based logic
const TransferModal = ({ selectedIds, senderUsername, user, onClose, onSuccess }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1); 
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState(""); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Fetch users for recipient list
        axios.get("http://localhost:5000/api/users")
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
                setUsers(data);
            })
            .catch(err => console.error("Fetch Users Error:", err));
    }, []);

    const handleTransfer = async () => {
        // Security checks
        if (!password) return alert("Password is required for security.");
        if (!reason.trim()) return alert("Please provide a reason for this transfer.");
        
        setIsSubmitting(true);

        try {
            /** * Updated Payload:
             * We send 'user.role' to the backend so the Governance system 
             * knows if this requires HOD or Admin approval.
             */
            const response = await axios.post("http://localhost:5000/api/transfer/secure-send", {
                senderUsername: senderUsername, 
                senderRole: user?.role, // CRITICAL: Used for hierarchical filtering
                password: password, 
                recipientId: selectedUser?._id, 
                fileIds: selectedIds,
                reason: reason,
                requestType: 'transfer'
            });
            
            alert(response.data.message || "Transfer request processed."); 
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error("Transfer Error:", err.response?.data);
            // Handle password verification or server errors
            alert(err.response?.data?.error || err.response?.data?.message || "Error creating transfer request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>
                    {step === 1 ? `Transfer Files (${selectedIds.length})` : "Security & Governance"}
                </Modal.Title>
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
                                (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) && 
                                u.username !== senderUsername
                            )
                            .map(u => (
                                <ListGroup.Item 
                                    key={u._id} 
                                    active={selectedUser?._id === u._id} 
                                    onClick={() => setSelectedUser(u)} 
                                    action
                                    className="d-flex justify-content-between"
                                >
                                    <span>{u.username}</span>
                                    <small className={selectedUser?._id === u._id ? "text-white" : "text-muted"}>
                                        {u.role}
                                    </small>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </>
                ) : (
                    <div className="p-2">
                        <div className="text-center mb-4">
                            <ShieldLock size={40} className="mb-2 text-primary" />
                            <h6>Finalize Transfer to {selectedUser?.username}</h6>
                            <p className="text-muted small">Your request will be sent to your supervisor for approval.</p>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label><ChatLeftText className="me-2" />Purpose of Transfer</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="e.g., Project handover for Q1"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Verify Your Identity</Form.Label>
                            <Form.Control
                                type="password" 
                                placeholder="Enter your login password" 
                                value={password}
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
                        Next Step
                    </Button>
                ) : (
                    <div className="d-flex w-100 gap-2">
                        <div className="w-50">
                            <Button variant="secondary" className="w-100" onClick={() => setStep(1)} disabled={isSubmitting}>
                                Back
                            </Button>
                        </div>
                        <div className="w-50">
                            <Button variant="success" className="w-100" onClick={handleTransfer} disabled={isSubmitting}>
                                {isSubmitting ? <Spinner size="sm" animation="border" /> : "Confirm & Send"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default TransferModal;