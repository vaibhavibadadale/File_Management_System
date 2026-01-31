import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaEye, FaEyeSlash, FaCheckCircle, FaLock } from 'react-icons/fa';

const RequestActionPage = () => {
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [comment, setComment] = useState(""); 
    const [loading, setLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const action = searchParams.get("action");
    const requestId = searchParams.get("t"); 
    const userId = searchParams.get("i"); 

    const handleConfirm = async (e) => {
        e.preventDefault();
        
        if (!requestId || !userId) {
        return Swal.fire('Error', 'Invalid link. Missing Request or User identification.', 'error');
    }
    
        const result = await Swal.fire({
            title: `Confirm ${action}?`,
            text: "This action will be logged in the security audit.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: action === 'approve' ? '#28a745' : '#d33',
            confirmButtonText: 'Confirm'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            const response = await axios.post(`http://localhost:5000/api/requests/secure-action/${requestId}`, {
                action, password, userId, comment: (action !== 'approve') ? comment : ""
            });
            
            await Swal.fire('Success!', response.data.message, 'success');
            setIsFinished(true); 
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || "Action failed", 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isFinished) {
        return (
            <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
                <div className="card p-5 shadow border-0 text-center" style={{ width: '400px', borderRadius: '15px' }}>
                    <FaCheckCircle size={50} className="text-success mb-3 mx-auto" />
                    <h4>Action Complete</h4>
                    <p className="text-muted">Notifications have been sent. You can close this tab.</p>
                    <button className="btn btn-primary" onClick={() => window.close()}>Close Tab</button>
                </div>
            </div>
        );
    }

    return (
        <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="card p-4 shadow-lg border-0" style={{ width: '400px', borderRadius: '15px' }}>
                <h4 className="text-center fw-bold text-primary mb-3">Security Portal</h4>
                <div className={`alert ${action === 'approve' ? 'alert-success' : 'alert-danger'} text-center py-1 fw-bold mb-4`}>
                    Target Action: {action?.toUpperCase()}
                </div>

                <form onSubmit={handleConfirm}>
                    {action !== 'approve' && (
                        <div className="mb-3">
                            <label className="form-label small fw-bold text-danger">REASON FOR DENIAL</label>
                            <textarea className="form-control" rows="3" value={comment} onChange={(e) => setComment(e.target.value)} required />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="form-label small fw-bold"><FaLock className="me-1" /> Enter Password</label>
                        <div className="input-group">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="form-control shadow-none" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button className={`btn w-100 fw-bold text-white ${action === 'approve' ? 'btn-success' : 'btn-danger'}`} disabled={loading}>
                        {loading ? "Processing..." : `Confirm Authorization`}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RequestActionPage;