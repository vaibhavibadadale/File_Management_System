import React, { useState } from "react";
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { ShieldLock, ExclamationTriangle } from 'react-bootstrap-icons';

function DeleteModal({ isOpen, onClose, onConfirm, itemName, itemCount, isDark }) {
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Reset state when modal closes
    const handleClose = () => {
        setStep(1);
        setPassword("");
        setReason("");
        setError(null);
        onClose();
    };

    const handleConfirmSubmit = async () => {
        if (!reason.trim()) return setError("Please provide a reason for deletion.");
        if (!password) return setError("Verification password is required.");

        setIsSubmitting(true);
        setError(null);
        
        try {
            // Pass the reason and password back to the parent component's confirm handler
            await onConfirm({ reason, password });
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || "Error processing deletion.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal show={isOpen} onHide={handleClose} centered backdrop="static" size="md">
            <Modal.Header closeButton className={`border-0 pb-0 ${isDark ? 'bg-dark text-white border-secondary' : ''}`}>
                <Modal.Title className="fw-bold">
                    {step === 1 ? "Confirm Delete" : "Security Verification"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className={`${isDark ? 'bg-dark text-white' : ''}`}>
                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

                {step === 1 ? (
                    <div className="text-center p-2">
                        <div className="mb-3">
                            <ExclamationTriangle className="text-danger" size={50} />
                        </div>
                        <p className={`fs-5 ${isDark ? "text-light" : "text-dark"}`}>
                            {itemCount > 1 
                                ? `Are you sure you want to delete ${itemCount} selected items?` 
                                : `Are you sure you want to delete "${itemName}"?`}
                        </p>
                        <p className="small text-danger fw-bold">This action cannot be undone and will be logged.</p>
                    </div>
                ) : (
                    <div className="p-2 text-center">
                        <div className="bg-danger bg-opacity-10 p-3 rounded-circle d-inline-block mb-3">
                            <ShieldLock size={40} className="text-danger" />
                        </div>
                        <h6 className="fw-bold">Verify Identity to Delete</h6>
                        
                        <Form.Group className="mb-3 text-start mt-4">
                            <Form.Label className={`small fw-bold ${isDark ? 'text-info' : 'text-secondary'}`}>REASON FOR DELETION</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="State the reason for removing these items..."
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
                    <div className="d-flex w-100 gap-2">
                        <Button 
                            variant={isDark ? "outline-light" : "light"} 
                            className="w-50 py-2 fw-bold" 
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={() => setStep(2)} 
                            className="w-50 py-2 fw-bold"
                        >
                            Continue
                        </Button>
                    </div>
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
                            variant="danger" 
                            className="w-50 py-2 fw-bold" 
                            onClick={handleConfirmSubmit} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Spinner size="sm" animation="border" /> : "Confirm Delete"}
                        </Button>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    );
}

export default DeleteModal;