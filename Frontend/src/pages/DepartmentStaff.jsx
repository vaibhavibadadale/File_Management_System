import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Badge, Table, Card, Spinner, Button, Container } from "react-bootstrap";

const DepartmentStaff = ({ currentTheme }) => {
    const { deptId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState({ hods: [], employees: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/users/dept/${deptId}`);
                setData(res.data);
            } catch (err) {
                console.error("Error fetching staff:", err);
            } finally {
                setLoading(false);
            }
        };
        if (deptId) fetchStaff();
    }, [deptId]);

    const isDark = currentTheme === "dark";

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <Container fluid className={`py-4 ${isDark ? "bg-dark text-white" : "bg-light"}`}>
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
                <div>
                    <h2 className="fw-bold mb-0" style={{ color: "#333" }}>Department Directory</h2>
                    <p className="text-muted mb-0">Managing assigned staff and leadership</p>
                </div>
                <Button 
                    variant="outline-primary" 
                    className="fw-bold px-4"
                    onClick={() => navigate("/ventures")}
                >
                    <i className="fas fa-arrow-left me-2"></i> Back to Ventures
                </Button>
            </div>

            {/* HOD SECTION */}
            <div className="mb-5">
                <h4 className="fw-bold mb-3 d-flex align-items-center">
                    <span className="bg-danger rounded-circle me-2" style={{ width: '10px', height: '10px' }}></span>
                    Assigned Head of Department (HOD)
                </h4>
                <div className="row">
                    {data.hods.length > 0 ? (
                        data.hods.map(h => (
                            <div key={h._id} className="col-md-4 mb-3">
                                <Card className="border-0 shadow-sm h-100">
                                    <Card.Body className="p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h5 className="fw-bold mb-0 text-capitalize">{h.name}</h5>
                                                <small className="text-muted">{h.username}</small>
                                            </div>
                                            <Badge bg="danger" className="px-3 py-2 text-uppercase">HOD</Badge>
                                        </div>
                                        <div className="mb-3 text-muted small">
                                            <i className="fas fa-envelope me-2"></i>{h.email}
                                        </div>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm" 
                                            className="w-100 mt-2 fw-bold"
                                            onClick={() => navigate(`/user-files/${h.username}`)}
                                        >
                                            <i className="fas fa-eye me-2"></i> View Profile
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </div>
                        ))
                    ) : (
                        <div className="col-12">
                            <div className="alert alert-secondary border-0 shadow-sm text-center py-4">
                                No HOD assigned to this department.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* EMPLOYEES SECTION */}
            <div>
                <h4 className="fw-bold mb-3 d-flex align-items-center">
                    <span className="bg-primary rounded-circle me-2" style={{ width: '10px', height: '10px' }}></span>
                    Department Employees
                </h4>
                <div className="bg-white rounded shadow-sm overflow-hidden">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="py-3 ps-4 border-0 text-uppercase small fw-bold text-muted">Employee ID</th>
                                <th className="py-3 border-0 text-uppercase small fw-bold text-muted">Full Name</th>
                                <th className="py-3 border-0 text-uppercase small fw-bold text-muted">Role</th>
                                <th className="py-3 border-0 text-uppercase small fw-bold text-muted">Email Address</th>
                                <th className="py-3 pe-4 border-0 text-uppercase small fw-bold text-muted text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.employees.length > 0 ? (
                                data.employees.map(e => (
                                    <tr key={e._id} className="align-middle">
                                        <td className="ps-4 py-3">
                                            <span className="badge bg-light text-danger border">{e.employeeId}</span>
                                        </td>
                                        <td className="fw-bold text-capitalize">{e.name}</td>
                                        <td>
                                            <Badge bg="primary" className="px-3 py-2 text-uppercase">Employee</Badge>
                                        </td>
                                        <td className="text-muted">{e.email}</td>
                                        <td className="pe-4 text-end">
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="rounded-circle"
                                                onClick={() => navigate(`/user-files/${e.username}`)}
                                            >
                                                <i className="fas fa-eye"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <i className="fas fa-users-slash fa-3x mb-3 d-block opacity-25"></i>
                                        No employees found for this department.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </Container>
    );
};

export default DepartmentStaff;
