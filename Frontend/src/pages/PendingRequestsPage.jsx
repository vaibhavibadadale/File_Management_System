import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Table, Badge, Container, Card, Button, Spinner, Form, Modal, Alert, InputGroup, Row, Col
} from "react-bootstrap";
import {
  FaCheck, FaTimes, FaHistory, FaHourglassHalf, FaArrowUp, FaArrowDown,
  FaTrashAlt, FaExchangeAlt, FaUserShield, FaSearch,
  FaChevronLeft, FaChevronRight, FaSyncAlt
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
      Swal.fire("Error", "Could not fetch dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, [user, pPage, hPage, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchDashboard(), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchDashboard]);

  const handleApprove = async (id) => {
    const result = await Swal.fire({
      title: "Approve Request?",
      text: "This action will be processed and the file status will be updated immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Approve",
      background: isDark ? "#1a1d20" : "#fff",
      color: isDark ? "#fff" : "#000",
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      try {
        await axios.put(`http://localhost:5000/api/requests/approve/${id}`, {
          approverUsername: user.username
        });
        Swal.fire({ title: "Success!", icon: "success", timer: 2000 });
        fetchDashboard();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Approval failed.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
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
      Swal.fire("Denied", "The request has been rejected.", "success");
      fetchDashboard();
    } catch (err) {
      Swal.fire("Error", "Rejection failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaginationControls = (current, total, setPage) => {
    const safeTotal = isNaN(total) || total < 1 ? 1 : total;
    return (
      <div className="d-flex justify-content-end align-items-center py-2 gap-2">
        <Button variant={isDark ? "outline-light" : "outline-primary"} size="sm" disabled={current === 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>
          <FaChevronLeft />
        </Button>
        <span className="small fw-bold text-muted mx-2">{current} / {safeTotal}</span>
        <Button variant={isDark ? "outline-light" : "outline-primary"} size="sm" disabled={current >= safeTotal} onClick={() => setPage(p => p + 1)}>
          <FaChevronRight />
        </Button>
      </div>
    );
  };

  const renderTable = (title, items, isMain) => {
    const currentPage = isMain ? pPage : hPage;
    const totalPages = isMain ? data.pendingTotalPages : data.historyTotalPages;
    const setPage = isMain ? setPPage : setHPage;

    return (
      <Card className={`mb-5 border-0 ${isDark ? "bg-dark text-white shadow-lg" : "shadow-sm"}`}>
        <Card.Header className={`${isMain ? "bg-primary" : "bg-dark"} text-white py-3`}>
          <Row className="align-items-center">
            <Col xs={12} md={6} className="d-flex align-items-center">
              {isMain ? <FaHourglassHalf className="me-2" /> : <FaHistory className="me-2" />}
              <h6 className="mb-0">{title} <Badge bg="light" text="dark" className="ms-2">{isMain ? data.totalPending : data.totalHistory}</Badge></h6>
              <Button variant="link" className="text-white ms-2 p-0" onClick={fetchDashboard}><FaSyncAlt size={12}/></Button>
            </Col>
            {isMain && (
              <Col xs={12} md={6}>
                <InputGroup size="sm" style={{ maxWidth: "250px" }} className="ms-md-auto mt-2 mt-md-0">
                  <InputGroup.Text className={isDark ? "bg-secondary border-0 text-white" : "bg-light border-0"}><FaSearch /></InputGroup.Text>
                  <Form.Control placeholder="Search by reason..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={isDark ? "bg-secondary border-0 text-white shadow-none" : "border-0 shadow-none"} />
                </InputGroup>
              </Col>
            )}
          </Row>
        </Card.Header>

        <Table responsive hover variant={isDark ? "dark" : "light"} className="text-center mb-0">
          <thead>
            <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: "0.7rem" }}>
              <th>Dir</th><th>Type</th><th>Sender Info</th><th>Receiver Info</th><th>Files</th><th>Reason / Denial</th><th>Date</th><th>Action</th>
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
                    if (myRole === "SUPERADMIN") canApprove = true;
                    else if (myRole === "ADMIN" && ["HOD", "EMPLOYEE", "USER"].includes(senderRole)) canApprove = true;
                    else if (myRole === "HOD" && ["EMPLOYEE", "USER"].includes(senderRole) && getCleanDeptId(user.departmentId) === getCleanDeptId(req.departmentId)) canApprove = true;
                }

                return (
                  <tr key={req._id} className="align-middle border-bottom">
                    <td>{isMyOwnRequest ? <FaArrowUp className="text-warning" /> : <FaArrowDown className="text-info" />}</td>
                    <td>{req.requestType === "delete" ? <Badge bg="danger"><FaTrashAlt /></Badge> : <Badge bg="success"><FaExchangeAlt /></Badge>}</td>
                    <td><div className="fw-bold">{req.senderUsername}</div>{renderDeptInfo(req.senderDeptName || req.departmentId, req.senderRole)}</td>
                    <td>{req.requestType === "delete" ? <span className="text-danger fw-bold small">SYSTEM</span> : <div className="fw-bold text-truncate" style={{maxWidth: '120px'}}>{req.recipientId?.username || "N/A"}</div>}</td>
                    <td className="text-start">{req.fileIds?.slice(0, 2).map((f, i) => (<div key={i} className="text-truncate small">{f.originalName || "File"}</div>))}</td>
                    <td className="text-start"><div className="small"><strong>Reason:</strong> {req.reason}</div></td>
                    <td style={{ fontSize: "0.75rem" }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      {isMain ? (
                        canApprove ? (
                          <div className="d-flex gap-2 justify-content-center">
                            <Button variant="success" size="sm" onClick={() => handleApprove(req._id)} disabled={isSubmitting}><FaCheck /></Button>
                            <Button variant="danger" size="sm" onClick={() => { setActiveRequestId(req._id); setShowDenyModal(true); }} disabled={isSubmitting}><FaTimes /></Button>
                          </div>
                        ) : <Badge bg="info">{isMyOwnRequest ? "SENT" : "PENDING"}</Badge>
                      ) : <Badge bg={req.status === "completed" ? "success" : "danger"}>{req.status?.toUpperCase()}</Badge>}
                    </td>
                  </tr>
                );
              })
            ) : <tr><td colSpan="8" className="py-5 text-muted">No records found.</td></tr>}
          </tbody>
        </Table>
        <Card.Footer className="bg-transparent border-0">{renderPaginationControls(currentPage, totalPages, setPage)}</Card.Footer>
      </Card>
    );
  };

  return (
    <Container fluid className="mt-4 px-4 pb-5">
      {loading && data.mainRequests.length === 0 ? <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div> : (
        <>
          {renderTable("Awaiting Approval", data.mainRequests, true)}
          {renderTable("Request History", data.logs, false)}
        </>
      )}

      <Modal show={showDenyModal} onHide={() => !isSubmitting && setShowDenyModal(false)} centered>
        <Modal.Header closeButton className={isDark ? "bg-dark text-white border-secondary" : ""}>
          <Modal.Title className="h6 text-danger fw-bold">Reject Request</Modal.Title>
        </Modal.Header>
        <Modal.Body className={isDark ? "bg-dark text-white" : ""}>
          <Form.Group>
            <Form.Label className="small fw-bold">Reason for Rejection</Form.Label>
            <Form.Control as="textarea" rows={3} value={denialComment} onChange={(e) => setDenialComment(e.target.value)} className={isDark ? "bg-secondary border-secondary text-white" : ""} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className={isDark ? "bg-dark border-secondary" : ""}>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowDenyModal(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={handleConfirmDeny} disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : "Confirm Reject"}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingRequestsPage;