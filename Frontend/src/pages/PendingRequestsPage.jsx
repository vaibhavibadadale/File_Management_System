import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Table, Button, Badge, Container, Card, Spinner, Row, Col } from 'react-bootstrap';
import { FaCheck, FaTimes, FaSync, FaFileAlt, FaHistory, FaInbox, FaPaperPlane } from 'react-icons/fa';

const PendingRequestsPage = ({ user, currentTheme }) => {
    const [data, setData] = useState({ mySentRequests: [], requestsToApprove: [], logs: [] });
    const [deptMap, setDeptMap] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchDeptNames = useCallback(async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/departments");
            const map = {};
            if (Array.isArray(res.data)) {
                res.data.forEach(d => {
                    map[d._id] = d.name;
                    if (d.code) map[d.code] = d.name;
                });
            }
            setDeptMap(map);
        } catch (err) { console.error("Dept Fetch Error", err); }
    }, []);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/transfer/pending`, {
                params: { 
                    role: user.role, 
                    username: user.username, 
                    departmentId: user.departmentId 
                }
            });
            setData(res.data || { mySentRequests: [], requestsToApprove: [], logs: [] });
        } catch (err) { console.error("Dashboard Fetch Error", err); }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchDeptNames();
            fetchDashboard();
        }
    }, [user, fetchDashboard, fetchDeptNames]);

    const handleAction = async (id, action) => {
        let denialComment = "";
        if (action === 'deny') {
            denialComment = window.prompt("REASON FOR DENIAL:");
            if (denialComment === null) return;
            if (!denialComment.trim()) return alert("You must provide a reason for denial.");
        } else {
            if (!window.confirm("Are you sure you want to approve this request?")) return;
        }

        try {
            await axios.put(`http://localhost:5000/api/transfer/${action}/${id}`, { 
                denialComment: denialComment || "" 
            });
            fetchDashboard();
        } catch (err) {
            console.error(err);
            alert("Action failed: " + (err.response?.data?.error || "Server Error"));
        }
    };

    /**
     * HIERARCHICAL FILTERING LOGIC
     * Determines if the current user has the authority to approve a request
     */
    const canIApproveThis = (request) => {
        const myRole = user.role?.toUpperCase();
        const senderRole = request.senderRole?.toUpperCase() || 'EMPLOYEE';

        // 1. Super Admin is the ultimate boss
        if (myRole === 'SUPER_ADMIN') return true;

        // 2. Admin can approve HOD and Employee
        if (myRole === 'ADMIN') {
            return senderRole === 'HOD' || senderRole === 'EMPLOYEE';
        }

        // 3. HOD can only approve Employee
        if (myRole === 'HOD') {
            return senderRole === 'EMPLOYEE';
        }

        // 4. Employees cannot approve anything
        return false;
    };

    const TableComponent = ({ title, items = [], showActions, icon: Icon, isApprovalTable }) => {
        
        // Filter items if this is the Approval Table based on Hierarchy
        const filteredItems = isApprovalTable 
            ? items.filter(req => canIApproveThis(req)) 
            : items;

        return (
            <Card className={`mb-5 border-0 shadow-sm ${currentTheme === 'dark' ? 'bg-dark text-white shadow-none' : ''}`}>
                <Card.Header className={`fw-bold py-3 d-flex align-items-center ${currentTheme === 'dark' ? 'bg-secondary text-white' : 'bg-light'}`}>
                    <Icon className="me-2"/> {title} 
                    {isApprovalTable && <Badge bg="primary" className="ms-2">{filteredItems.length}</Badge>}
                </Card.Header>
                <Table responsive hover variant={currentTheme === 'dark' ? 'dark' : 'light'} className="mb-0">
                    <thead className="small text-uppercase">
                        <tr>
                            <th>Sender</th>
                            <th>Receiver</th>
                            <th>Department</th>
                            <th>File Details</th>
                            <th>Reason / Notes</th>
                            <th>Status</th>
                            {showActions && <th className="text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length > 0 ? filteredItems.map(req => {
                            const safeReason = req.reason || "No reason";
                            const reasonParts = safeReason.split('|');
                            const userNote = reasonParts[0];
                            const adminNote = reasonParts.find(p => p.includes('DENIAL REASON:'));

                            return (
                                <tr key={req._id} className="align-middle">
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="fw-bold text-primary">@{req.senderUsername}</span>
                                            <small className="text-muted" style={{fontSize: '10px'}}>{req.senderRole}</small>
                                        </div>
                                    </td>
                                    <td>
                                        {req.requestType === 'delete' ? (
                                            <Badge bg="danger"><FaTimes className="me-1"/> DELETE</Badge>
                                        ) : (
                                            <Badge bg="secondary">@{req.recipientId?.username || "System"}</Badge>
                                        )}
                                    </td>
                                    <td>
                                        <Badge bg="info" className="text-dark py-1 px-2">
                                            {deptMap[req.departmentId] || req.senderDepartment || "General"}
                                        </Badge>
                                    </td>
                                    <td>
                                        {req.fileIds?.map((f, i) => (
                                            <div key={i} className="small text-truncate" style={{maxWidth: '180px'}}>
                                                <FaFileAlt className="me-1 text-muted"/> {f.originalName || f.filename}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="small" style={{maxWidth: '220px'}}>
                                        <div className="text-wrap">{userNote}</div>
                                        {adminNote && (
                                            <div className="mt-1 p-1 rounded bg-danger bg-opacity-10 text-danger fw-bold border-start border-danger border-3">
                                                {adminNote.replace('DENIAL REASON:', 'Denied:')}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <Badge bg={req.status === 'completed' ? 'success' : req.status === 'denied' ? 'danger' : 'warning'}>
                                            {req.status?.toUpperCase()}
                                        </Badge>
                                    </td>
                                    {showActions && req.status === 'pending' && (
                                        <td>
                                            <div className="d-flex justify-content-center gap-2">
                                                <Button variant="success" size="sm" onClick={() => handleAction(req._id, 'approve')} title="Approve">
                                                    <FaCheck/>
                                                </Button>
                                                <Button variant="danger" size="sm" onClick={() => handleAction(req._id, 'deny')} title="Deny">
                                                    <FaTimes/>
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan="7" className="text-center py-5 text-muted">No pending approvals for your level.</td></tr>
                        )}
                    </tbody>
                </Table>
            </Card>
        );
    };

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{height: '60vh'}}>
            <Spinner animation="grow" variant="primary" />
            <p className="mt-3 text-muted fw-bold">Loading Governance Data...</p>
        </div>
    );

    return (
        <Container fluid className="py-4 px-lg-5">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2 className="fw-bold mb-0">File Governance & Logs</h2>
                    <p className="text-muted small">
                        Logged in as: <strong className="text-primary">{user.username}</strong> 
                        <Badge bg="dark" className="ms-2">{user.role}</Badge>
                    </p>
                </Col>
                <Col xs="auto">
                    <Button variant="outline-primary" onClick={fetchDashboard} className="rounded-pill px-4">
                        <FaSync className="me-2" /> Refresh Dashboard
                    </Button>
                </Col>
            </Row>

            {/* Section 1: Hierarchical Pending Approvals */}
            {user.role !== 'EMPLOYEE' && (
                <TableComponent 
                    title="Requests Awaiting My Approval" 
                    items={data.requestsToApprove} 
                    showActions={true} 
                    icon={FaInbox}
                    isApprovalTable={true}
                />
            )}

            {/* Section 2: User's Own Sent Requests */}
            <TableComponent 
                title="My Sent History" 
                items={data.mySentRequests} 
                icon={FaPaperPlane}
                isApprovalTable={false}
            />

            {/* Section 3: Full Audit Logs (Visible to Admin/Super Admin Only) */}
            {['ADMIN', 'SUPER_ADMIN'].includes(user.role?.toUpperCase()) && (
                <TableComponent 
                    title="Global Audit Logs (System History)" 
                    items={data.logs} 
                    icon={FaHistory}
                    isApprovalTable={false}
                />
            )}
        </Container>
    );
};

export default PendingRequestsPage;