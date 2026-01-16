import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, ListGroup, Form, InputGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Search, ShieldLock, Person, ArrowRightCircle } from 'react-bootstrap-icons';
import { transferFilesApi } from '../services/apiService';

const TransferModal = ({ selectedIds, senderUsername, user, onClose, onSuccess, currentTheme }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1); 
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState(""); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const isDark = currentTheme === "dark";

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await axios.get("http://localhost:5000/api/users", {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
                setUsers(data.filter(u => u.username !== senderUsername));
            } catch (err) {
                setError("Could not load user list.");
            }
        };
        fetchUsers();
    }, [senderUsername]);

    const handleTransfer = async () => {
        if (!password) return setError("Verification password is required.");
        if (!reason.trim()) return setError("Please provide a reason for the transfer.");
        
        setIsSubmitting(true);
        setError(null);

        try {
            const transferData = {
                senderUsername: senderUsername, 
                senderRole: user?.role?.toUpperCase() || "EMPLOYEE", 
                recipientId: selectedUser?._id, 
                fileIds: selectedIds,
                reason: reason,
                requestType: 'transfer',
                departmentId: user?.departmentId?._id || user?.departmentId,
                password: password 
            };

            const response = await transferFilesApi(transferData);
            alert(response.message || "Request processed"); 
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || "Error processing transfer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered backdrop="static" size="md">
            {/* Conditional classes for Header, Body, and Footer */}
            <Modal.Header closeButton className={`border-0 pb-0 ${isDark ? 'bg-dark text-white border-secondary' : ''}`}>
                <Modal.Title className="fw-bold">
                    {step === 1 ? `Transferring ${selectedIds.length} Item(s)` : "Security Verification"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className={`${isDark ? 'bg-dark text-white' : ''}`}>
                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                
                {step === 1 ? (
                    <div className="mt-2">
                        <Form.Label className={`small fw-bold ${isDark ? 'text-light' : 'text-muted'}`}>SELECT RECIPIENT</Form.Label>
                        <InputGroup className="mb-3">
                            <InputGroup.Text className={isDark ? 'bg-secondary border-secondary text-white' : 'bg-white'}>
                                <Search />
                            </InputGroup.Text>
                            <Form.Control 
                                placeholder="Search by name..." 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className={isDark ? 'bg-secondary border-secondary text-white placeholder-light' : ''}
                                style={isDark ? { colorScheme: 'dark' } : {}}
                            />
                        </InputGroup>

                        <ListGroup className={`shadow-sm border-0 ${isDark ? 'bg-dark' : ''}`} style={{maxHeight: '280px', overflowY: 'auto'}}>
                           {users
                            .filter(u => (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(u => {
                                const isSelected = selectedUser?._id === u._id;
                                return (
                                    <ListGroup.Item 
                                        key={u._id} 
                                        active={isSelected} 
                                        onClick={() => setSelectedUser(u)} 
                                        action
                                        className={`d-flex justify-content-between align-items-center py-3 ${
                                            isDark && !isSelected ? 'bg-dark text-white border-secondary' : ''
                                        }`}
                                    >
                                        <div className="d-flex align-items-center">
                                            <div className={`p-2 rounded-circle me-3 ${
                                                isSelected ? 'bg-white text-primary' : (isDark ? 'bg-secondary text-light' : 'bg-light text-secondary')
                                            }`}>
                                                <Person size={20} />
                                            </div>
                                            <div>
                                                <div className="fw-bold">{u.username}</div>
                                                <small className={isSelected ? "text-white" : (isDark ? "text-info" : "text-muted")}>
                                                    {typeof u.departmentId === 'object' ? u.departmentId?.departmentName : 'General Department'}
                                                </small>
                                            </div>
                                        </div>
                                        <Badge bg={isSelected ? "light" : "primary"} text={isSelected ? "primary" : "white"}>
                                            {u.role}
                                        </Badge>
                                    </ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    </div>
                ) : (
                    <div className="p-2 text-center">
                        <div className="bg-primary bg-opacity-10 p-3 rounded-circle d-inline-block mb-3">
                            <ShieldLock size={40} className="text-primary" />
                        </div>
                        <h6 className="fw-bold">Confirm Transfer to {selectedUser?.username}</h6>
                        
                        <Form.Group className="mb-3 text-start mt-4">
                            <Form.Label className={`small fw-bold ${isDark ? 'text-info' : 'text-secondary'}`}>REASON</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Purpose of transfer..."
                                className={isDark ? 'bg-secondary border-secondary text-white' : ''}
                            />
                        </Form.Group>

                        <Form.Group className="text-start">
                            <Form.Label className={`small fw-bold ${isDark ? 'text-info' : 'text-secondary'}`}>PASSWORD</Form.Label>
                            <Form.Control
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Enter login password"
                                className={isDark ? 'bg-secondary border-secondary text-white' : ''}
                            />
                        </Form.Group>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className={`border-0 pt-0 ${isDark ? 'bg-dark border-secondary' : ''}`}>
                {step === 1 ? (
                    <Button variant="primary" onClick={() => setStep(2)} disabled={!selectedUser} className="w-100 py-2 fw-bold">
                        Continue <ArrowRightCircle className="ms-2" />
                    </Button>
                ) : (
                    <div className="d-flex w-100 gap-2">
                        <Button 
                            variant={isDark ? "outline-light" : "light"} 
                            className="w-50 py-2 fw-bold" 
                            onClick={() => setStep(1)} 
                            disabled={isSubmitting}
                        >
                            Back
                        </Button>
                        <Button variant="success" className="w-50 py-2 fw-bold" onClick={handleTransfer} disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="sm" animation="border" /> : "Confirm"}
                        </Button>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default TransferModal;