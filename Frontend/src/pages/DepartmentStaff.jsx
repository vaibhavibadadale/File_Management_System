import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Added useNavigate
import axios from "axios";
import { Badge, Table, Card, Spinner, Button } from "react-bootstrap"; // Added Button

const DepartmentStaff = ({ currentTheme }) => {
    const { deptId } = useParams();
    const navigate = useNavigate(); // Initialize navigate hook
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                // Fetching users filtered by Department ID
                const res = await axios.get(`http://localhost:5000/api/users/department/${deptId}`);
                setStaff(res.data);
            } catch (err) {
                console.error("Error fetching staff:", err);
            } finally {
                setLoading(false);
            }
        };
        if (deptId) fetchStaff();
    }, [deptId]);

    const isDark = currentTheme === "dark";

    // Filter Logic
    const hods = staff.filter(u => ["HOD", "ADMIN", "SUPERADMIN"].includes(u.role?.toUpperCase()));
    const employees = staff.filter(u => ["EMPLOYEE"].includes(u.role?.toUpperCase()));

    // Redirect Function
    const handleViewProfile = (username) => {
        navigate(`/user-files/${username}`);
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <div className={`container-fluid py-4 ${isDark ? "text-white" : "text-dark"}`}>
            <div className="mb-4">
                <h2>Department Directory</h2>
                <p className="text-muted">Viewing all members assigned to this venture.</p>
            </div>
            
            {/* HOD SECTION */}
            <section className="mb-5">
                <h4 className={`border-bottom pb-2 mb-4 ${isDark ? "border-secondary" : ""}`}>
                    Heads of Department (HOD)
                </h4>
                {hods.length > 0 ? (
                    <div className="row">
                        {hods.map(h => (
                            <div key={h._id} className="col-md-4 mb-3">
                                <Card className={`h-100 shadow-sm ${isDark ? "bg-dark text-white border-secondary" : "border-primary"}`}>
                                    <Card.Body className="d-flex flex-column">
                                        <h5 className="mb-1">{h.name}</h5>
                                        <p className={`${isDark ? "text-info" : "text-muted"} small mb-2`}>{h.email}</p>
                                        <div className="mt-auto d-flex justify-content-between align-items-center">
                                            <Badge bg={isDark ? "info" : "primary"}>{h.role}</Badge>
                                            <Button 
                                                variant={isDark ? "outline-info" : "outline-primary"} 
                                                size="sm"
                                                onClick={() => handleViewProfile(h.username)}
                                            >
                                                View Profile
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </div>
                        ))}
                    </div>
                ) : <div className="alert alert-secondary">No HOD assigned to this department.</div>}
            </section>

            {/* EMPLOYEES SECTION */}
            <section>
                <h4 className={`border-bottom pb-2 mb-4 ${isDark ? "border-secondary" : ""}`}>
                    Employees
                </h4>
                {employees.length > 0 ? (
                    <div className={`card shadow-sm border-0 ${isDark ? "bg-dark" : ""}`}>
                        <Table hover responsive className={`mb-0 ${isDark ? "table-dark" : ""}`}>
                            <thead>
                                <tr>
                                    <th className="ps-4">Employee ID</th>
                                    <th>Full Name</th>
                                    <th>Email Address</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(e => (
                                    <tr key={e._id}>
                                        <td className="ps-4"><code>{e.employeeId}</code></td>
                                        <td className="fw-bold">{e.name}</td>
                                        <td>{e.email}</td>
                                        <td className="text-end pe-4">
                                            <Button 
                                                variant={isDark ? "outline-info" : "outline-primary"} 
                                                size="sm"
                                                onClick={() => handleViewProfile(e.username)}
                                            >
                                                View Profile
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                ) : <div className="alert alert-secondary">No employees found for this department.</div>}
            </section>
        </div>
    );
};

export default DepartmentStaff;