import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import axios from 'axios';

const DeleteRequestModal = ({ show, onHide, file, user, onSuccess }) => {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (reason.trim().length < 5) {
            return alert("Please provide a valid reason (at least 5 characters).");
        }

        setLoading(true);
        try {
            await axios.post("http://localhost:5000/api/transfer/secure-send", {
                senderUsername: user.username,
                password: user.password, // Ensure password is in your user session or prompt for it
                fileIds: [file._id],
                type: 'deletion',
                reason: reason
            });
            alert("Deletion request sent to Admin.");
            if (onSuccess) onSuccess();
            onHide();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Request File Deletion</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to request deletion for: <br/> 
                   <strong>{file?.fileName}</strong>?</p>
                <Form.Group>
                    <Form.Label>Reason for Deletion (One line)</Form.Label>
                    <Form.Control 
                        type="text" 
                        placeholder="e.g., File is outdated or a duplicate"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="danger" onClick={handleSubmit} disabled={loading}>
                    {loading ? <Spinner size="sm" animation="border" /> : "Submit Request"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default DeleteRequestModal;