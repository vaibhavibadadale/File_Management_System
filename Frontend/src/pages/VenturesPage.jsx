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
        departmentCode: "",
        description: ""
    });

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

    const handleRowClick = (id) => {
        window.open(`/department-staff/${id}`, "_blank");
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        // Sending data to your router.post("/")
        const response = await axios.post("http://localhost:5000/api/departments", formData);
        
        if (response.status === 201) {
            setShowModal(false); 
            setFormData({ departmentName: "", departmentCode: "", description: "" }); 
            fetchDepts(); // This triggers your getAllDepartments logic
            alert("Department created successfully!");
        }
    } catch (err) {
        // Check if the error is a 'Unique Constraint' error from MongoDB
        const errorMessage = err.response?.data?.error?.includes("duplicate key") 
            ? "Error: Department Name or Code already exists!" 
            : err.response?.data?.error || "Server Error";
            
        alert(errorMessage);
        console.error("Creation Error:", err);
    }
};

    const filtered = departments.filter(d => 
        d.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4">
            {/* Header Section with Button */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className={currentTheme === 'dark' ? 'text-white' : 'text-dark'}>Ventures (Departments)</h3>
                <div className="d-flex gap-3 w-50 justify-content-end">
                    <input 
                        type="text" 
                        placeholder="Search departments..." 
                        className={`form-control w-50 ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setShowModal(true)}
                    >
                        + Add New Department
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className={`card shadow-sm border-0 ${currentTheme === 'dark' ? 'bg-dark' : ''}`}>
                <div className="table-responsive">
                    <table className={`table mb-0 ${currentTheme === 'dark' ? 'table-dark table-hover' : 'table-hover'}`}>
                        <thead className={currentTheme === 'dark' ? 'table-dark' : 'table-light'}>
                            <tr>
                                <th className="ps-4">Dept Name</th>
                                <th>Code</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" className="text-center py-4">Loading...</td></tr>
                            ) : filtered.map(dept => (
                                <tr key={dept._id} className="align-middle">
                                    <td className="ps-4">
                                        <div 
                                            className="text-primary fw-bold" 
                                            onClick={() => handleRowClick(dept._id)}
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            {dept.departmentName}
                                        </div>
                                    </td>
                                    <td><code>{dept.departmentCode}</code></td>
                                    <td><span className="badge bg-success-subtle text-success border border-success">Active</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Department Modal */}
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
                                        <input 
                                            type="text" 
                                            name="departmentName" 
                                            className={`form-control ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                                            required 
                                            value={formData.departmentName}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Department Code</label>
                                        <input 
                                            type="text" 
                                            name="departmentCode" 
                                            className={`form-control ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                                            required 
                                            value={formData.departmentCode}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Description (Optional)</label>
                                        <textarea 
                                            name="description" 
                                            className={`form-control ${currentTheme === 'dark' ? 'bg-dark text-white border-secondary' : ''}`}
                                            value={formData.description}
                                            onChange={handleInputChange}
                                        ></textarea>
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
        </div>
    );
};

export default VenturesPage;