import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Table, Badge, Container, Card, Button, Spinner, Form, InputGroup } from "react-bootstrap";
import { FaFileAlt, FaTrash, FaExchangeAlt, FaSearch, FaCheck, FaTimes, FaCommentAlt } from "react-icons/fa";

const PendingRequestsPage = ({ user, currentTheme }) => {
    const [data, setData] = useState({ mainRequests: [], logs: [], totalMain: 0, totalLogs: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchDashboard = useCallback(async () => {
        if (user.role.toUpperCase() === "EMPLOYEE") {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get("http://localhost:5000/api/requests/pending", {
                params: { 
                    role: user.role, 
                    username: user.username, 
                    departmentId: user.departmentId,
                    search: searchTerm 
                }
            });
            setData(res.data);
        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            setLoading(false);
        }
    }, [user, searchTerm]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const handleAction = async (id, action) => {
        let payload = {};
        
        if (action === "deny") {
            const comment = window.prompt("Please enter a reason for denial:");
            if (comment === null) return; 
            payload = { denialComment: comment };
        }

        try {
            // Corrected URL matching backend routes
            await axios.put(`http://localhost:5000/api/requests/${action}/${id}`, payload);
            fetchDashboard();
        } catch (err) { 
            console.error("Action failed", err);
            alert(`Action ${action} failed`); 
        }
    };

    const renderTable = (title, items, isMainTable = false) => (
        <Card className={`mb-5 ${currentTheme === "dark" ? "bg-dark text-white border-secondary" : "shadow-sm border-0"}`}>
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0">{title}</h5>
                <InputGroup size="sm" style={{ width: "250px" }}>
                    <InputGroup.Text><FaSearch /></InputGroup.Text>
                    <Form.Control 
                        placeholder="Search..." 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className={currentTheme === "dark" ? "bg-secondary text-white border-0" : ""}
                    />
                </InputGroup>
            </Card.Header>
            <Table responsive hover variant={currentTheme === "dark" ? "dark" : "light"} className="mb-0">
                <thead>
                    <tr className="small text-uppercase text-muted border-bottom">
                        <th>Dir</th>
                        <th>Type</th>
                        <th>Sender</th>
                        <th>Dept</th>
                        <th>Files</th>
                        <th>Reason / Comments</th>
                        <th>Status</th>
                        {isMainTable && <th className="text-center">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {items.length > 0 ? items.map((req) => (
                        <tr key={req._id} className="align-middle">
                            <td>{req.senderUsername === user.username ? "⬇️" : "⬆️"}</td>
                            <td>{req.requestType === "delete" ? <FaTrash className="text-danger"/> : <FaExchangeAlt className="text-warning"/>}</td>
                            <td><b>@{req.senderUsername}</b></td>
                            <td><Badge bg="info">{req.senderDepartment || "General"}</Badge></td>
                            <td>
                                {req.fileIds?.map((f, i) => (
                                    <div key={i} className="small text-truncate" style={{maxWidth: "150px"}}>
                                        <FaFileAlt className="me-1 text-primary"/>{f.originalName || f.folderName}
                                    </div>
                                ))}
                            </td>
                            <td className="small">
                                {/* The main reason field */}
                                <div className="text-muted">{req.reason || "No original reason"}</div>
                                
                                {/* Fix for Red Denial Text: Ensure we check both reason AND denialComment */}
                                {req.status === "denied" && (
                                    <div className="text-danger mt-1 fw-bold">
                                        <FaCommentAlt size={10} className="me-1"/>
                                        {/* This checks if the comment is stored in a separate field or inside the reason */}
                                        Denied: {req.denialComment || (req.reason?.includes("DENIED:") ? req.reason.split("DENIED:")[1] : "Action Rejected")}
                                    </div>
                                )}
                            </td>
                            <td>
                                <Badge bg={req.status === "completed" ? "success" : req.status === "denied" ? "danger" : "warning"}>
                                    {req.status.toUpperCase()}
                                </Badge>
                            </td>
                            {isMainTable && (
                                <td className="text-center">
                                    {req.status === "pending" && req.senderUsername !== user.username ? (
                                        <div className="d-flex gap-2 justify-content-center">
                                            <Button size="sm" variant="success" onClick={() => handleAction(req._id, "approve")}><FaCheck /></Button>
                                            <Button size="sm" variant="danger" onClick={() => handleAction(req._id, "deny")}><FaTimes /></Button>
                                        </div>
                                    ) : (
                                        <span className="text-muted small">No Action Required</span>
                                    )}
                                </td>
                            )}
                        </tr>
                    )) : (
                        <tr><td colSpan="8" className="text-center py-4 text-muted">No records found</td></tr>
                    )}
                </tbody>
            </Table>
        </Card>
    );

    if (user.role.toUpperCase() === "EMPLOYEE") {
        return (
            <Container className="mt-5 text-center">
                <Card className={`p-5 shadow-sm border-0 ${currentTheme === "dark" ? "bg-dark text-white" : ""}`}>
                    <h3 className="text-primary">Requests Status</h3>
                    <p className="text-muted">You cannot approve requests. Your requests are sent to your HOD and Admins.</p>
                </Card>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4 px-4">
            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                <>
                    {renderTable("Pending Approvals", data.mainRequests, true)}
                    {renderTable("Global History & Audit Logs", data.logs, false)}
                </>
            )}
        </Container>
    );
};

export default PendingRequestsPage;