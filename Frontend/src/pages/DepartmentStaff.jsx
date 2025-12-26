import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const DepartmentStaff = () => {
    const { deptId } = useParams();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                // Ensure this matches the new route we will create in your backend
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

    // Separate HODs and Employees (Case-insensitive check)
    const hods = staff.filter(u => ["HOD", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(u.role?.toUpperCase()));
    const employees = staff.filter(u => ["EMPLOYEE"].includes(u.role?.toUpperCase()));

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    return (
        <div className="container py-5">
            <div className="d-flex align-items-center mb-4">
                <h2 className="mb-0">Department Directory</h2>
            </div>
            
            {/* HOD SECTION */}
            <section className="mb-5">
                <h4 className="text-primary border-bottom pb-2 mb-4">Heads of Department (HOD)</h4>
                {hods.length > 0 ? (
                    <div className="row">
                        {hods.map(h => (
                            <div key={h._id} className="col-md-4 mb-3">
                                <div className="card border-primary h-100 shadow-sm">
                                    <div className="card-body">
                                        <h5 className="card-title mb-1">{h.name}</h5>
                                        <p className="text-muted small mb-2">{h.email}</p>
                                        <span className="badge bg-primary-subtle text-primary border border-primary">{h.role}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <div className="alert alert-light border">No HOD assigned to this department.</div>}
            </section>

            {/* EMPLOYEES SECTION */}
            <section>
                <h4 className="text-secondary border-bottom pb-2 mb-4">Employees</h4>
                {employees.length > 0 ? (
                    <div className="card border-0 shadow-sm">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Employee ID</th>
                                    <th>Full Name</th>
                                    <th>Email Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(e => (
                                    <tr key={e._id} className="align-middle">
                                        <td className="ps-4"><code>{e.employeeId}</code></td>
                                        <td className="fw-bold">{e.name}</td>
                                        <td className="text-muted">{e.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="alert alert-light border">No employees found for this department.</div>}
            </section>
        </div>
    );
};

export default DepartmentStaff;