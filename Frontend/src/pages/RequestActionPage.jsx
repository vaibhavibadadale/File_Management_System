import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RequestActionPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [denialComment, setDenialComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const id = searchParams.get("id");
    const action = searchParams.get("action");
    const email = searchParams.get("email");

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await axios.post(`http://localhost:5000/api/requests/secure-action/${id}`, {
                action, password, denialComment, email
            });
            setIsSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
                <div className="card border-0 shadow-sm p-5 text-center" style={{ borderRadius: '15px', maxWidth: '400px' }}>
                    <div className="mb-3 text-success"><i className="fas fa-check-circle fa-4x"></i></div>
                    <h4 className="fw-bold">Success</h4>
                    <p className="text-muted">The request has been {action}ed.</p>
                    <button onClick={() => navigate('/login')} className="btn btn-dark w-100 mt-3 py-2">Back to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f8f9fa" }}>
            <div className="card border-0 shadow-sm p-4" style={{ width: "100%", maxWidth: "380px", borderRadius: "12px" }}>
                <div className="text-center mb-4">
                    <h5 className="fw-bold">Security Verification</h5>
                    <p className="text-muted small">Enter password for <b>{email}</b></p>
                </div>

                {error && <div className="alert alert-light border-0 text-danger small text-center py-2 mb-3" style={{ backgroundColor: '#fff5f5' }}>{error}</div>}

                <form onSubmit={handleVerify}>
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">PASSWORD</label>
                        <input 
                            type="password" 
                            className="form-control bg-light border-0 py-2 shadow-none" 
                            placeholder="Your Admin Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>

                    {action === "deny" && (
                        <div className="mb-3">
                            <label className="form-label small fw-bold text-muted">DENIAL REASON</label>
                            <textarea 
                                className="form-control bg-light border-0 shadow-none" 
                                rows="3"
                                value={denialComment}
                                onChange={(e) => setDenialComment(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-dark w-100 py-2 fw-bold" style={{ backgroundColor: "#1a1a1a", borderRadius: "8px" }} disabled={loading}>
                        {loading ? "Verifying..." : `Confirm ${action}`}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RequestActionPage;