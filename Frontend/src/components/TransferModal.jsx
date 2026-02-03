import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Modal, Button, ListGroup, Form, InputGroup, Spinner, Alert, Badge } from 'react-bootstrap';
import { Search, ShieldLock, Person, ArrowRightCircle, Files, XCircle, CalendarDate } from 'react-bootstrap-icons';
import { transferFilesApi } from '../services/apiService';

const TransferModal = ({ selectedIds, senderUsername, user, onClose, onSuccess, currentTheme }) => {
    const [users, setUsers] = useState([]);
    const [senderData, setSenderData] = useState(null); 
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1); 
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState(""); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const isDark = currentTheme === "dark";

    // 1. Fetch Sender Info and User List from Database
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch all users for the selection list
                const res = await axios.get("http://localhost:5000/api/users", { headers });
                const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
                setUsers(data.filter(u => u.username !== senderUsername));

                // Fetch specific data for the current sender
                const currentUser = data.find(u => u.username === senderUsername);
                if (currentUser) {
                    setSenderData(currentUser);
                }
            } catch (err) {
                setError("Could not load data from server.");
            }
        };
        fetchData();
    }, [senderUsername]);

    // 2. Handle the actual transfer
    const handleTransfer = async () => {
        if (!password) return setError("Verification password is required.");
        if (!reason.trim()) return setError("Please provide a reason for the transfer.");
        
        setIsSubmitting(true);
        setError(null);

        try {
            const deptId = user?.departmentId?._id || user?.departmentId || senderData?.departmentId?._id;
            
            // Capture current date for the transfer record
            const currentDate = new Date().toISOString();

            const transferData = {
                senderUsername: senderUsername, 
                transferDate: currentDate, // Replaced senderRole with transferDate
                recipientId: selectedUser?._id, 
                receiverName: selectedUser?.username,
                receiverDeptName: selectedUser?.departmentId?.departmentName || "General",
                receiverRole: selectedUser?.role || "USER",
                fileIds: selectedIds,
                reason: reason,
                requestType: 'transfer',
                departmentId: deptId,
                password: password 
            };

            const response = await transferFilesApi(transferData);
            
            await Swal.fire({
                title: 'Request Sent',
                text: response.message || "Your transfer request is pending approval.",
                icon: 'success',
                background: isDark ? '#212529' : '#fff',
                color: isDark ? '#fff' : '#000',
                confirmButtonColor: '#0d6efd'
            });
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            const errMsg = err.response?.data?.error || "Error processing transfer request.";
            setError(errMsg);
            
            Swal.fire({
                title: 'Transfer Failed',
                text: errMsg,
                icon: 'error',
                background: isDark ? '#212529' : '#fff',
                color: isDark ? '#fff' : '#000'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u => 
        (u.username || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal show={true} onHide={onClose} centered backdrop="static" size="md">
            <Modal.Header closeButton className={`border-0 pb-0 ${isDark ? 'bg-dark text-white' : ''}`}>
                <Modal.Title className="fw-bold fs-5 d-flex align-items-center">
                    {step === 1 ? (
                        <>
                            <Files className="me-2 text-primary" size={20} />
                            Transfer {selectedIds.length} Item(s)
                        </>
                    ) : (
                        "Security Verification"
                    )}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className={`${isDark ? 'bg-dark text-white' : ''}`}>
                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                
                {step === 1 ? (
                    <div className="mt-2">
                        <Form.Label className={`small fw-bold mb-2 ${isDark ? 'text-light' : 'text-muted'}`}>SELECT RECIPIENT</Form.Label>
                        <InputGroup className="mb-3">
                            <InputGroup.Text className={isDark ? 'bg-secondary border-secondary text-white' : 'bg-white border-end-0'}>
                                <Search size={14}/>
                            </InputGroup.Text>
                            <Form.Control 
                                placeholder="Search by name..." 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className={isDark ? 'bg-secondary border-secondary text-white placeholder-light' : 'border-start-0'}
                                autoFocus
                            />
                        </InputGroup>

                        <ListGroup className={`shadow-sm border-0 ${isDark ? 'bg-dark' : ''}`} style={{maxHeight: '300px', overflowY: 'auto'}}>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(u => {
                                    const isSelected = selectedUser?._id === u._id;
                                    return (
                                        <ListGroup.Item 
                                            key={u._id} 
                                            active={isSelected} 
                                            onClick={() => setSelectedUser(u)} 
                                            action
                                            className={`d-flex justify-content-between align-items-center py-3 mb-1 rounded border-0 ${
                                                isDark && !isSelected ? 'bg-secondary bg-opacity-10 text-white' : ''
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
                                                    <small className={isSelected ? "text-white-50" : (isDark ? "text-info" : "text-muted")}>
                                                        {u.departmentId?.departmentName || 'General'}
                                                    </small>
                                                </div>
                                            </div>
                                            {/* We display the current date for the transfer logic here */}
                                            <div className={`small ${isSelected ? 'text-white' : 'text-muted'}`}>
                                                <CalendarDate className="me-1" />
                                                {new Date().toLocaleDateString()}
                                            </div>
                                        </ListGroup.Item>
                                    );
                                })
                            ) : (
                                <div className="text-center py-5 opacity-50">
                                    <XCircle size={30} className="mb-2" />
                                    <p>No users found matching "{searchTerm}"</p>
                                </div>
                            )}
                        </ListGroup>
                    </div>
                ) : (
                    <div className="p-2 text-center">
                        <div className="bg-primary bg-opacity-10 p-3 rounded-circle d-inline-block mb-3">
                            <ShieldLock size={40} className="text-primary" />
                        </div>
                        <h6 className="fw-bold mb-1">Confirm Identity</h6>
                        <p className="small text-muted mb-2">
                            Transferring {selectedIds.length} items to <strong>{selectedUser?.username}</strong>
                        </p>
                        
                        {/* Data Column Replacement: Date Display */}
                        <div className="mb-4">
                             <Badge bg="info" className="px-3 py-2">
                                <CalendarDate className="me-2" />
                                Transfer Date: {new Date().toLocaleDateString()}
                             </Badge>
                        </div>
                        
                        <Form.Group className="mb-3 text-start">
                            <Form.Label className={`small fw-bold ${isDark ? 'text-info' : 'text-secondary'}`}>REASON FOR TRANSFER</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why are you transferring these files?"
                                className={isDark ? 'bg-secondary border-secondary text-white' : ''}
                            />
                        </Form.Group>

                        <Form.Group className="text-start">
                            <Form.Label className={`small fw-bold ${isDark ? 'text-info' : 'text-secondary'}`}>YOUR PASSWORD</Form.Label>
                            <Form.Control
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Enter password to confirm"
                                className={isDark ? 'bg-secondary border-secondary text-white' : ''}
                            />
                        </Form.Group>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className={`border-0 pt-0 pb-4 px-4 ${isDark ? 'bg-dark' : ''}`}>
                {step === 1 ? (
                    <Button 
                        variant="primary" 
                        onClick={() => setStep(2)} 
                        disabled={!selectedUser} 
                        className="w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center"
                    >
                        Review Transfer <ArrowRightCircle className="ms-2" />
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
                        <Button 
                            variant="success" 
                            className="w-50 py-2 fw-bold shadow-sm" 
                            onClick={handleTransfer} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner size="sm" animation="border" className="me-2" />
                                    Processing...
                                </>
                            ) : "Confirm & Send"}
                        </Button>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default TransferModal;