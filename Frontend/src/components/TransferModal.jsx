import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, ListGroup, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Search, ShieldLock, ChatLeftText } from 'react-bootstrap-icons';

const TransferModal = ({ selectedIds, senderUsername, onClose, onSuccess }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1); 
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState(""); // Added reason for governance
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Ensure this matches your actual user fetch endpoint
        axios.get("http://localhost:5000/api/users")
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
                setUsers(data);
            })
            .catch(err => console.error("Fetch Users Error:", err));
    }, []);

    const handleTransfer = async () => {
        if (!password) return alert("Password is required for security.");
        if (!reason.trim()) return alert("Please provide a reason for this transfer.");
        
        setIsSubmitting(true);

        try {
            // ✅ CORRECTED URL: Matches the backend route we created
            const response = await axios.post("http://localhost:5000/api/requests/create", {
                senderUsername: senderUsername, 
                password: password, // Note: Backend must verify this or remove if handled via Auth
                recipientId: selectedUser?._id, 
                fileIds: selectedIds,
                reason: reason,
                requestType: 'transfer' // Explicitly set request type
            });
            
            alert(response.data.message || "Request processed successfully!"); 
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            // Captures the 500 error message from backend
            console.error("Transfer Error:", err.response?.data);
            alert(err.response?.data?.message || "Internal Server Error (500). Check backend console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>{step === 1 ? `Transfer Files (${selectedIds.length})` : "Security & Governance"}</Modal.Title>
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
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label><ChatLeftText className="me-2" />Purpose of Transfer</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="e.g., Departmental hand-over"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Verify Your Password</Form.Label>
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
                    <Button onClick={() => setStep(2)} disabled={!selectedUser} className="w-100">Next Step</Button>
                ) : (
                    <div className="d-flex w-100 gap-2">
                        <span className="w-50"><Button variant="secondary" className="w-100" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button></span>
                        <span className="w-50"><Button variant="success" className="w-100" onClick={handleTransfer} disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="sm" animation="border" /> : "Confirm & Send"}
                        </Button></span>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default TransferModal;