import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Row, Col, Badge } from "react-bootstrap";
import axios from "axios";
import "../styles/VenturesPage.css"; 

const VenturesPage = ({ currentTheme, user }) => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        departmentName: "",
        departmentCode: "", 
        description: "" 
    });

    const isDark = currentTheme === 'dark';
 
    // --- Role-Based Flags ---
    const userRole = (user?.role || "").toLowerCase();
    const isSuperAdmin = userRole === "superadmin";
    const isAdmin = userRole === "admin";
    const isHOD = userRole === "hod";
    const isEmployee = userRole === "employee";

    const canCreateDept = isSuperAdmin || isAdmin;

    const fetchDepts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:5000/api/departments?hidden=all`); 
            setDepartments(res.data);
        } catch (err) {
            console.error("Error fetching departments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        if (!isEmployee) fetchDepts(); 
    }, [isEmployee]);

    if (isEmployee) {
        return (
            <div className="p-5 text-center">
                <h2 className="text-danger">Access Denied</h2>
                <p className={isDark ? "text-white" : "text-dark"}>Employees do not have access to the Ventures module.</p>
            </div>
        );
    }

    const handleRowClick = (id) => {
        window.open(`/department-staff/${id}`, "_blank");
    };

    const generateDeptCode = (name) => {
        if (!name) return "";
        const prefix = name.substring(0, 3).toUpperCase().replace(/\s/g, "");
        const randomNum = Math.floor(1000 + Math.random() * 9000); 
        return `${prefix}-${randomNum}`;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "departmentName") {
            setFormData({ 
                ...formData, 
                departmentName: value, 
                departmentCode: generateDeptCode(value) 
            });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleToggleClick = async (deptId) => {
        if (!canCreateDept) {
            alert("Only Admins can change department status.");
            return;
        }
        try {
            await axios.patch(`http://localhost:5000/api/departments/toggle-status/${deptId}`, {});
            fetchDepts(); 
        } catch (err) {
            alert(err.response?.data?.error || "Error updating status");
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post("http://localhost:5000/api/departments", formData);
            setShowCreateModal(false);
            setFormData({ departmentName: "", departmentCode: "", description: "" });
            fetchDepts();
        } catch (err) {
            alert(err.response?.data?.error || "Error creating department");
        }
    };

    const filtered = departments.filter(d => 
        d.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.departmentCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className={isDark ? 'text-white' : 'text-dark'}>Ventures (Departments)</h3>
                
                {canCreateDept && (
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                        <i className="fas fa-plus me-2"></i> Add New Department
                    </Button>
                )}
            </div>

            <Row className="mb-4">
                <Col md={5}>
                    <Form.Control 
                        placeholder="Search name or code..." 
                        className={isDark ? 'bg-dark text-white border-secondary' : ''}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Col>
            </Row>

            <div className={`card shadow-sm border-0 ${isDark ? 'bg-dark' : ''}`}>
                <Table hover className={`mb-0 ${isDark ? 'table-dark' : ''}`}>
                    <thead className={isDark ? 'table-dark' : 'table-light'}>
                        <tr>
                            <th className="ps-4">Dept Name</th>
                            <th>Code</th>
                            <th className="text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" className="text-center py-4">Loading...</td></tr>
                        ) : filtered.length > 0 ? (
                            filtered.map(dept => (
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
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center">
                                            <div 
                                                className={`status-toggle-container ${dept.isActive !== false ? "active" : "inactive"}`}
                                                onClick={canCreateDept ? () => handleToggleClick(dept._id) : undefined}
                                                style={{ cursor: canCreateDept ? 'pointer' : 'default' }}
                                            >
                                                <Badge 
                                                    bg={dept.isActive !== false ? "success" : "danger"} 
                                                    className="status-badge d-flex align-items-center gap-1"
                                                >
                                                    <div className="toggle-dot"></div>
                                                    {dept.isActive !== false ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3" className="text-center py-4 text-muted">No departments found.</td></tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Create Modal */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
                <div className={isDark ? "bg-dark text-white border border-secondary rounded" : ""}>
                    <Modal.Header closeButton closeVariant={isDark ? "white" : undefined}>
                        <Modal.Title>New Department</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleCreateSubmit}>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Name</Form.Label>
                                <Form.Control 
                                    name="departmentName" 
                                    required 
                                    value={formData.departmentName}
                                    onChange={handleInputChange} 
                                    className={isDark ? 'bg-dark text-white border-secondary' : ''} 
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Code (Auto-generated)</Form.Label>
                                <Form.Control 
                                    value={formData.departmentCode} 
                                    readOnly 
                                    className={isDark ? 'bg-dark text-white border-secondary opacity-50' : 'bg-light'} 
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Description (Optional)</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    rows={3}
                                    name="description" 
                                    value={formData.description}
                                    onChange={handleInputChange} 
                                    placeholder="Enter department details..."
                                    className={isDark ? 'bg-dark text-white border-secondary' : ''} 
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit">Create Department</Button>
                        </Modal.Footer>
                    </Form>
                </div>
            </Modal>
        </div>
    );
};

export default VenturesPage;