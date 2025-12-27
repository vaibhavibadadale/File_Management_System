import React, { useState, useEffect } from "react";
import axios from "axios";

const VenturesPage = ({ currentTheme }) => {
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        departmentName: "",
        departmentCode: "", // Now auto-generated
        description: ""
    });

    // Verification State for Deactivation
    const [verificationModal, setVerificationModal] = useState({ show: false, deptId: null, password: "" });

    const fetchDepts = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/departments");
            setDepartments(res.data);
        } catch (err) {
            console.error("Error fetching departments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepts();
    }, []);

    // AUTO-GENERATE CODE LOGIC
    // Generates a code based on the name (e.g., "Human Resources" -> "HR-随机数")
    useEffect(() => {
        if (formData.departmentName.trim()) {
            const acronym = formData.departmentName
                .split(/\s/)
                .map(word => word[0])
                .join('')
                .toUpperCase();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            setFormData(prev => ({ ...prev, departmentCode: `${acronym}-${randomNum}` }));
        } else {
            setFormData(prev => ({ ...prev, departmentCode: "" }));
        }
    }, [formData.departmentName]);

    const handleRowClick = (id) => {
        window.open(`/department-staff/${id}`, "_blank");
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/api/departments", formData);
            if (response.status === 201) {
                setShowModal(false); 
                setFormData({ departmentName: "", departmentCode: "", description: "" }); 
                fetchDepts();
                alert("Department created successfully!");
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.includes("duplicate key") 
                ? "Error: Department Name or Code already exists!" 
                : err.response?.data?.error || "Server Error";
            alert(errorMessage);
        }
    };

    // STATUS TOGGLE LOGIC
    const handleStatusToggle = (dept) => {
        if (dept.status === "Active") {
            // Trigger PIN/Password Modal for Deactivation
            setVerificationModal({ show: true, deptId: dept._id, password: "" });
        } else {
            // Directly activate
            updateStatus(dept._id, "Active");
        }
    };

const confirmDeactivation = async () => {
    try {
        const res = await axios.patch(`http://localhost:5000/api/departments/toggle-status/${verificationModal.deptId}`, {
            password: verificationModal.password,
            userId: currentUser._id // Pass the ID of the logged-in user
        });
        // ... handle success
    } catch (err) {
        alert(err.response?.data?.error || "Verification failed");
    }
};

    const updateStatus = async (id, newStatus) => {
        try {
            await axios.patch(`http://localhost:5000/api/departments/${id}/status`, { status: newStatus });
            fetchDepts();
        } catch (err) {
            console.error("Status update failed", err);
        }
    };

    const filtered = departments.filter(d => 
        d.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className={currentTheme === 'dark' ? 'text-white' : 'text-dark'}>Ventures (Departments)</h3>
                <div className="d-flex gap-3 w-50 justify-content-end">
                    <input 
                        type="text" 
                        placeholder="Search departments..." 
                        className={`form-control w-50 ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add New Department</button>
                </div>
            </div>

            <div className={`card shadow-sm border-0 ${currentTheme === 'dark' ? 'bg-dark' : ''}`}>
                <div className="table-responsive">
                    <table className={`table mb-0 ${currentTheme === 'dark' ? 'table-dark table-hover' : 'table-hover'}`}>
                        <thead className={currentTheme === 'dark' ? 'table-dark' : 'table-light'}>
                            <tr>
                                <th className="ps-4">Dept Name</th>
                                <th>Code</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center py-4">Loading...</td></tr>
                            ) : filtered.map(dept => (
                                <tr key={dept._id} className="align-middle">
                                    <td className="ps-4">
                                        <div className="text-primary fw-bold" onClick={() => handleRowClick(dept._id)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                                            {dept.departmentName}
                                        </div>
                                    </td>
                                    <td><code>{dept.departmentCode}</code></td>
                                    <td>
                                        <span className={`badge ${dept.status === 'Inactive' ? 'bg-danger-subtle text-danger border border-danger' : 'bg-success-subtle text-success border border-success'}`}>
                                            {dept.status || "Active"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="form-check form-switch">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                checked={dept.status !== "Inactive"} 
                                                onChange={() => handleStatusToggle(dept)} 
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className={`modal-content ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}>
                            <div className="modal-header">
                                <h5 className="modal-title">Create New Department</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Department Name</label>
                                        <input type="text" name="departmentName" className={`form-control ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`} required value={formData.departmentName} onChange={handleInputChange} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Department Code (Auto-generated)</label>
                                        <input type="text" name="departmentCode" className="form-control bg-light" readOnly value={formData.departmentCode} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Description (Optional)</label>
                                        <textarea name="description" className={`form-control ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`} value={formData.description} onChange={handleInputChange}></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Department</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Modal for Deactivation */}
            {verificationModal.show && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-sm modal-dialog-centered">
                        <div className={`modal-content border-danger ${currentTheme === 'dark' ? 'bg-dark text-white' : ''}`}>
                            <div className="modal-header">
                                <h5 className="modal-title text-danger">Confirm Deactivation</h5>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to deactivate this department? Please enter your PIN/Password to confirm.</p>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    placeholder="Enter PIN" 
                                    value={verificationModal.password}
                                    onChange={(e) => setVerificationModal({...verificationModal, password: e.target.value})}
                                />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-link text-secondary" onClick={() => setVerificationModal({show: false, deptId: null, password: ""})}>Cancel</button>
                                <button className="btn btn-danger" onClick={confirmDeactivation}>Deactivate</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VenturesPage;