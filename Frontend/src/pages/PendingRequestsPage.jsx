import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Table, Badge, Container, Card, Button, Spinner, Form, Modal, Alert, InputGroup, Row, Col
} from "react-bootstrap";
import {
  FaCheck, FaTimes, FaHistory, FaHourglassHalf, FaArrowUp, FaArrowDown,
  FaTrashAlt, FaExchangeAlt, FaUserShield, FaSearch,
  FaChevronLeft, FaChevronRight
} from "react-icons/fa";

const PendingRequestsPage = ({ user, currentTheme }) => {
  const [data, setData] = useState({
    mainRequests: [],
    logs: [],
    pendingTotalPages: 1,
    historyTotalPages: 1,  
    totalPending: 0,
    totalHistory: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pPage, setPPage] = useState(1);
  const [hPage, setHPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denialComment, setDenialComment] = useState("");
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = currentTheme === "dark";

  // --- HELPERS ---

  const getCleanDeptId = (dept) => {
    if (!dept) return null;
    return typeof dept === 'object' ? (dept._id || dept.id) : dept;
  };

  const renderDeptInfo = (dept, role) => {
    const upperRole = role?.toUpperCase();
    const deptName = typeof dept === 'object' ? (dept?.departmentName || dept?.name) : dept;

    if (["ADMIN", "SUPERADMIN"].includes(upperRole)) {
      return (
        <span className="text-danger fw-bold d-block" style={{ fontSize: '0.65rem' }}>
          <FaUserShield className="me-1" /> {upperRole}
        </span>
      );
    }
    return (
      <span className="text-primary d-block" style={{ fontSize: '0.65rem' }}>
        {deptName || "General"} [{upperRole || "USER"}]
      </span>
    );
  };

  // --- DATA FETCHING ---

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const deptId = getCleanDeptId(user.departmentId);
      const res = await axios.get("http://localhost:5000/api/requests/pending-dashboard", {
        params: {
          role: user.role?.toUpperCase(),
          username: user.username,
          departmentId: deptId,
          pPage,
          hPage,
          limit: 5,
          search: searchTerm,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, pPage, hPage, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchDashboard(), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchDashboard]);

  // --- ACTIONS ---

  const handleApprove = async (id) => {
    Swal.fire({
      title: "Approve Request?",
      text: "This action will be processed and logged immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Approve",
      background: isDark ? "#1a1d20" : "#fff",
      color: isDark ? "#fff" : "#000",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.put(`http://localhost:5000/api/requests/approve/${id}`, {
            approverUsername: user.username
          });
          
          // Role-based custom success message
          const isAdmin = ["ADMIN", "SUPERADMIN"].includes(user.role?.toUpperCase());
          Swal.fire({
            title: isAdmin ? "Transferred Successfully!" : "Approved!",
            text: isAdmin ? "Files have been transferred." : "Request completed successfully.",
            icon: "success",
            background: isDark ? "#1a1d20" : "#fff",
            color: isDark ? "#fff" : "#000",
          });
          fetchDashboard();
        } catch (err) {
          const msg = err.response?.data?.message || "Approval failed.";
          Swal.fire("Error", msg, "error");
        }
      }
    });
  };

  const handleConfirmDeny = async () => {
    if (!denialComment.trim()) return Swal.fire("Required", "Please enter a reason for rejection.", "info");
    setIsSubmitting(true);
    try {
      await axios.put(`http://localhost:5000/api/requests/deny/${activeRequestId}`, { 
        denialComment,
        approverUsername: user.username 
      });
      setShowDenyModal(false);
      setDenialComment("");
      Swal.fire({
        title: "Denied",
        text: "The request has been rejected.",
        icon: "success",
        background: isDark ? "#1a1d20" : "#fff",
        color: isDark ? "#fff" : "#000",
      });
      fetchDashboard();
    } catch (err) {
      Swal.fire("Error", "Rejection failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERERS ---

  const renderPaginationControls = (current, total, setPage) => {
    // FIX: Ensure 'total' is a valid number to prevent NaN/1 display
    const safeTotal = isNaN(total) || total < 1 ? 1 : total;

    return (
      <div className="d-flex justify-content-end align-items-center py-2 gap-2">
        <Button 
          variant={isDark ? "outline-light" : "outline-primary"} 
          size="sm" 
          style={{ fontSize: '0.75rem', borderRadius: '4px' }}
          disabled={current === 1}
          onClick={() => setPage(p => Math.max(p - 1, 1))}
        >
          <FaChevronLeft className="me-1" /> Prev
        </Button>

        <span className="small fw-bold text-muted mx-2">
          {current} / {safeTotal}
        </span>

        <Button 
          variant={isDark ? "outline-light" : "outline-primary"} 
          size="sm" 
          style={{ fontSize: '0.75rem', borderRadius: '4px' }}
          disabled={current >= safeTotal}
          onClick={() => setPage(p => p + 1)}
        >
          Next <FaChevronRight className="ms-1" />
        </Button>
      </div>
    );
  };

  const renderTable = (title, items, isMain) => {
    const currentPage = isMain ? pPage : hPage;
    const totalPages = isMain ? data.pendingTotalPages : data.historyTotalPages;
    const setPage = isMain ? setPPage : setHPage;

    return (
      <Card className={`mb-5 border-0 ${isDark ? "bg-dark text-white border-secondary shadow-lg" : "shadow-sm"}`}>
        <Card.Header className={`${isMain ? "bg-primary" : "bg-dark"} text-white py-3`}>
          <Row className="align-items-center">
            <Col xs={12} md={6} className="d-flex align-items-center">
              {isMain ? <FaHourglassHalf className="me-2" /> : <FaHistory className="me-2" />}
              <h6 className="mb-0">{title} <Badge bg="light" text="dark" className="ms-2">{isMain ? data.totalPending : data.totalHistory}</Badge></h6>
            </Col>
            {isMain && (
              <Col xs={12} md={6} className="mt-2 mt-md-0">
                <InputGroup size="sm" style={{ maxWidth: "250px" }} className="ms-md-auto">
                  <InputGroup.Text className={isDark ? "bg-secondary border-0 text-white" : "bg-light border-0"}><FaSearch /></InputGroup.Text>
                  <Form.Control
                    placeholder="Search sender..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={isDark ? "bg-secondary border-0 text-white shadow-none" : "border-0 shadow-none"}
                  />
                </InputGroup>
              </Col>
            )}
          </Row>
        </Card.Header>

        <Table responsive hover variant={isDark ? "dark" : "light"} className="text-center mb-0">
          <thead>
            <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: "0.7rem" }}>
              <th>Dir</th><th>Type</th><th>Sender Info</th><th>Receiver Info</th><th>Files</th><th>Reason / Denial Info</th><th>Date</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((req) => {
                const myRole = user.role?.toUpperCase();
                const senderRole = req.senderRole?.toUpperCase();
                const isMyOwnRequest = req.senderUsername === user.username;
                
                let canApprove = false;
                if (!isMyOwnRequest) {
                  if (myRole === "SUPERADMIN" || myRole === "ADMIN") {
                    canApprove = true;
                  } else if (myRole === "HOD") {
                    const myDeptId = getCleanDeptId(user.departmentId);
                    const senderDeptId = getCleanDeptId(req.departmentId);
                    if (["EMPLOYEE", "USER"].includes(senderRole) && myDeptId === senderDeptId) {
                      canApprove = true;
                    }
                  }
                }

                return (
                  <tr key={req._id} className="align-middle border-bottom">
                    <td>{isMyOwnRequest ? <FaArrowUp className="text-warning" /> : <FaArrowDown className="text-info" />}</td>
                    <td>
                      {req.requestType === "delete" ? 
                        <Badge bg="danger" className="p-2"><FaTrashAlt /></Badge> : 
                        <Badge bg="success" className="p-2"><FaExchangeAlt /></Badge>}
                    </td>
                    <td>
                      <div className="fw-bold">{req.senderUsername}</div>
                      {renderDeptInfo(req.senderDeptName || req.departmentId, req.senderRole)}
                    </td>
                    <td>
                      {req.requestType === "delete" ? (
                        <span className="text-muted small italic">SYSTEM (TRASH)</span>
                      ) : (
                        <>
                          <div className="fw-bold text-truncate" style={{maxWidth: '120px'}}>{req.receiverName || "N/A"}</div>
                          {renderDeptInfo(req.receiverDeptName, req.receiverRole)}
                        </>
                      )}
                    </td>
                    <td className="text-start">
                      {req.fileIds?.slice(0, 3).map((f, i) => (
                        <div key={i} className="text-truncate small" style={{ maxWidth: "160px" }}>
                          <span className="text-muted me-1">{i + 1}.</span> {f.originalName || "File"}
                        </div>
                      ))}
                      {req.fileIds?.length > 3 && (
                        <div className="ps-3"><small className="text-muted" style={{ fontSize: '0.65rem' }}>...and {req.fileIds.length - 3} more</small></div>
                      )}
                    </td>
                    <td className="text-start">
                      <div className="small mb-1"><strong>Reason:</strong> {req.reason}</div>
                      {!isMain && req.status === "denied" && (
                        <Alert variant="danger" className="py-2 px-2 m-0 mt-2 d-flex align-items-start border-0 shadow-sm" style={{ borderLeft: '4px solid #dc3545' }}>
                          <div style={{ fontSize: '0.7rem' }}>
                            <strong className="text-danger text-uppercase">Denied:</strong> {req.denialComment || "No reason."}
                          </div>
                        </Alert>
                      )}
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      {isMain ? (
                        canApprove ? (
                          <div className="d-flex gap-2 justify-content-center">
                            <Button variant="success" size="sm" onClick={() => handleApprove(req._id)} title="Approve"><FaCheck /></Button>
                            <Button variant="danger" size="sm" onClick={() => { setActiveRequestId(req._id); setShowDenyModal(true); }} title="Reject"><FaTimes /></Button>
                          </div>
                        ) : <Badge bg="info" className="px-2 py-1">AWAITING</Badge>
                      ) : (
                        <Badge bg={req.status === "completed" ? "success" : "danger"} className="px-3 py-2">
                          {req.status?.toUpperCase()}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : <tr><td colSpan="8" className="py-5 text-muted">No records found.</td></tr>}
          </tbody>
        </Table>
        
        <Card.Footer className="bg-transparent border-0 px-3">
            {renderPaginationControls(currentPage, totalPages, setPage)}
        </Card.Footer>
      </Card>
    );
  };

  return (
    <Container fluid className="mt-4 px-4 pb-5">
      {loading && data.mainRequests.length === 0 ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <>
          {renderTable("Awaiting Approval", data.mainRequests, true)}
          {renderTable("Global History", data.logs, false)}
        </>
      )}

      <Modal show={showDenyModal} onHide={() => setShowDenyModal(false)} centered>
        <Modal.Header closeButton className={isDark ? "bg-dark text-white border-secondary" : ""}>
          <Modal.Title className="h6 text-danger fw-bold">Reject Request</Modal.Title>
        </Modal.Header>
        <Modal.Body className={isDark ? "bg-dark text-white" : ""}>
          <Form.Group>
            <Form.Label className="small fw-bold mb-2 text-uppercase">Reason for Rejection</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              value={denialComment} 
              onChange={(e) => setDenialComment(e.target.value)} 
              placeholder="Provide a reason for rejection..." 
              className={isDark ? "bg-secondary border-secondary text-white shadow-none" : "shadow-none"}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className={isDark ? "bg-dark border-secondary" : ""}>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowDenyModal(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={handleConfirmDeny} disabled={isSubmitting}>
               Confirm Reject
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingRequestsPage;