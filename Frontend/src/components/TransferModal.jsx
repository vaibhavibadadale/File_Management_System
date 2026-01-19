import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Spinner } from 'react-bootstrap';
import { Search, ShieldLock, ChatLeftText, ArrowLeft, X } from 'react-bootstrap-icons';
import '../styles/TransferModel.css';

const TransferModal = ({ selectedIds, senderUsername, user, onClose, onSuccess, currentTheme }) => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Ensure your backend includes the 'department' field in the user objects
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
            const response = await axios.post("http://localhost:5000/api/transfer/secure-send", {
                senderUsername: senderUsername,
                senderRole: user?.role,
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
            alert(err.response?.data?.error || err.response?.data?.message || "Error creating transfer request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`wa-overlay ${currentTheme === 'dark' ? 'dark' : ''}`}>
            <div className="wa-modal">
                {/* Header Section */}
                <div className="wa-header">
                    <div className="wa-header-left">
                        {step === 2 && (
                            <button className="wa-back-btn" onClick={() => setStep(1)}>
                                <ArrowLeft />
                            </button>
                        )}
                        <h3>{step === 1 ? `Transfer Files (${selectedIds.length})` : "Security & Governance"}</h3>
                    </div>
                    <button className="wa-close-btn" onClick={onClose} aria-label="Close">
                        <X size={28} />
                    </button>
                </div>

                {step === 1 ? (
                    <>
                        <div className="wa-search-container">
                            <div className="wa-search-wrapper">
                                <Search size={14} />
                                <input 
                                    type="text"
                                    className="wa-search-input"
                                    placeholder="Search recipient..."
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="wa-user-list">
                            <div className="wa-section-title">Suggested Recipients</div>
                            {users
                                .filter(u => 
                                    (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) && 
                                    u.username !== senderUsername
                                )
                                .map(u => (
                                    <div 
                                        key={u._id} 
                                        className={`wa-user-item ${selectedUser?._id === u._id ? 'active-user' : ''}`}
                                        onClick={() => setSelectedUser(u)}
                                    >
                                        <div className="wa-avatar">
                                            {u.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="wa-user-info">
                                            <div className="wa-username">{u.username}</div>
                                            {/* Updated to display Role and Department */}
                                            <div className="wa-status">
                                                {u.role} {u.department ? `• ${u.department}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="wa-search-container" style={{borderTop: '1px solid var(--wa-border)'}}>
                            <button 
                                className="wa-send-btn w-100" 
                                disabled={!selectedUser}
                                onClick={() => setStep(2)}
                            >
                                Next Step
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="wa-password-container">
                        <ShieldLock size={40} className="mb-2" style={{color: '#00a884'}} />
                        <h4>Verify Identity</h4>
                        <p>
                            Transferring to <strong>{selectedUser?.username}</strong>
                            {selectedUser?.department && ` (${selectedUser.department})`}
                        </p>

                        <div className="mb-4 text-start">
                            <label className="wa-status mb-2 d-block"><ChatLeftText size={14} className="me-2"/> Purpose</label>
                            <textarea 
                                className="wa-password-input" 
                                style={{fontSize: '14px', letterSpacing: 'normal', textAlign: 'left', height: '80px'}}
                                placeholder="e.g., Project handover for Q1"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <div className="text-start">
                            <label className="wa-status mb-2 d-block">Your Password</label>
                            <input 
                                type="password" 
                                className="wa-password-input"
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="wa-action-btns">
                            <button className="wa-cancel-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                            <button className="wa-send-btn" onClick={handleTransfer} disabled={isSubmitting}>
                                {isSubmitting ? <Spinner size="sm" animation="border" /> : "Confirm & Send"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransferModal;