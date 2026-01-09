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
        <Container fluid className={`py-4 ${isDark ? "bg-dark text-white" : "bg-light"}`} style={{ minHeight: "100vh" }}>
            <div className={`d-flex justify-content-between align-items-center mb-4 p-3 rounded shadow-sm ${isDark ? "bg-secondary" : "bg-white"}`}>
                <div>
                    <h2 className="fw-bold mb-0" style={{ color: isDark ? "#fff" : "#333" }}>Department Directory</h2>
                    <p className={isDark ? "text-light opacity-75 mb-0" : "text-muted mb-0"}>Managing assigned staff and leadership</p>
                </div>
                <Button variant={isDark ? "outline-light" : "outline-primary"} className="fw-bold px-4" onClick={() => navigate("/ventures")}>
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
                                <Card className={`border-0 shadow-sm h-100 ${isDark ? "bg-dark text-white border border-secondary" : ""}`}>
                                    <Card.Body className="p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h5 className="fw-bold mb-0 text-capitalize">{h.name}</h5>
                                                <small className={isDark ? "text-info" : "text-muted"}>{h.username}</small>
                                            </div>
                                            <Badge bg="danger" className="px-3 py-2 text-uppercase">HOD</Badge>
                                        </div>
                                        <div className={`mb-3 small ${isDark ? "text-light opacity-75" : "text-muted"}`}>
                                            <i className="fas fa-envelope me-2"></i>{h.email}
                                        </div>
                                        <Button 
                                            variant={isDark ? "info" : "outline-primary"} 
                                            size="sm" 
                                            className="w-100 mt-2 fw-bold"
                                            // Redirects to UserFilesView using the Database _id
                                            onClick={() => navigate(`/user-files/${h._id}`)}
                                        >
                                            <i className="fas fa-eye me-2"></i> View Profile & Files
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </div>
                        ))
                    ) : (
                        <div className={`col-12 alert ${isDark ? "alert-dark border-secondary" : "alert-secondary"} text-center`}>
                            No HOD assigned.
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
                <div className={`rounded shadow-sm overflow-hidden ${isDark ? "bg-dark border border-secondary" : "bg-white"}`}>
                    <Table hover responsive className={`mb-0 ${isDark ? "table-dark" : ""}`}>
                        <thead className={isDark ? "table-dark" : "bg-light"}>
                            <tr>
                                <th className="ps-4">Employee ID</th>
                                <th>Full Name</th>
                                <th>Role</th>
                                <th>Email</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.employees.length > 0 ? (
                                data.employees.map(e => (
                                    <tr key={e._id} className="align-middle">
                                        <td className="ps-4">
                                            <span className={`badge border ${isDark ? "bg-black text-info border-secondary" : "bg-light text-danger"}`}>
                                                {e.employeeId}
                                            </span>
                                        </td>
                                        <td className="fw-bold text-capitalize">{e.name}</td>
                                        <td><Badge bg="primary">Employee</Badge></td>
                                        <td className={isDark ? "text-light opacity-75" : "text-muted"}>{e.email}</td>
                                        <td className="pe-4 text-end">
                                            <Button 
                                                variant={isDark ? "outline-info" : "outline-primary"} 
                                                size="sm" 
                                                className="rounded-circle"
                                                // Redirects to UserFilesView using the Database _id
                                                onClick={() => navigate(`/user-files/${e._id}`)}
                                                title="View Staff Files"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-4">No employees found in this department.</td>
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