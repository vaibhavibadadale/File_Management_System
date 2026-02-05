import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Container, Card, Badge, Spinner, Button, Row, Col, Form, InputGroup } from "react-bootstrap";
import { Visibility, Person, Business, Email, Badge as BadgeIcon, Search, ArrowBack, Storage, Block, CheckCircle } from "@mui/icons-material";
import axios from "axios";
import Swal from "sweetalert2";

const UserFilesView = ({ currentTheme, user }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isDark = currentTheme === "dark";
  const myRole = (user?.role || "").toLowerCase();
  const canManageFiles = myRole === "admin" || myRole === "superadmin";

  const swalConfig = {
    background: isDark ? "#212529" : "#fff",
    color: isDark ? "#fff" : "#545454",
  };

  const fetchUserDataAndLogs = async () => {
    try {
      setLoading(true);
      const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`);
      if (userRes.data) {
        setUserData(userRes.data);
        const fileRes = await axios.get(`http://localhost:5000/api/files?userId=${userRes.data._id}&all=true`);
        // Handle both object with files array or direct array
        const fileData = fileRes.data.files ? fileRes.data.files : fileRes.data;
        setFiles(Array.isArray(fileData) ? fileData : []);
      }
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (userId) fetchUserDataAndLogs(); }, [userId]);

  const handleViewFile = (file) => {
    if (file.isDisabled && !canManageFiles) {
      Swal.fire({ ...swalConfig, icon: "error", title: "Access Denied", text: "File disabled by admin." });
      return;
    }
    const fileUrl = `http://localhost:5000/uploads/${userData?.username}/${file.filename}`;
    window.open(fileUrl, "_blank");
  };

  const toggleFileStatus = async (fileId, currentIsDisabled) => {
    const action = currentIsDisabled ? "enable" : "disable";
    const result = await Swal.fire({
      ...swalConfig,
      title: `${action.toUpperCase()} File?`,
      text: `Are you sure you want to ${action} this file?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: currentIsDisabled ? "#198754" : "#dc3545",
      confirmButtonText: `Yes, ${action}!`,
    });

    if (result.isConfirmed) {
      try {
        // Send the toggled value: if it was disabled (true), set to false (enabled)
        await axios.put(`http://localhost:5000/api/files/toggle-status/${fileId}`, {
          isDisabled: !currentIsDisabled, 
          adminId: user?._id || user?.id,
        });
        
        Swal.fire({ ...swalConfig, icon: "success", title: "Updated!", timer: 1500, showConfirmButton: false });
        fetchUserDataAndLogs(); 
      } catch (err) {
        console.error("Update Error:", err);
        Swal.fire({ ...swalConfig, icon: "error", title: "Failed", text: "Error updating status." });
      }
    }
  };

  const filteredFiles = files.filter(f => (f.originalName || "").toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button variant={isDark ? "outline-light" : "outline-primary"} className="mb-4" onClick={() => navigate(-1)}>
          <ArrowBack className="me-2" /> Back
        </Button>

        {/* User Profile Overview */}
        <Card className={`mb-4 shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Body className="p-4">
            {loading ? <Spinner animation="border" /> : userData && (
              <Row className="align-items-center">
                <Col md={2} className="text-center border-end">
                  <Person style={{ fontSize: "60px", color: "#0d6efd" }} />
                  <h5 className="mb-0 fw-bold">{userData.name}</h5>
                  <small className="text-muted">@{userData.username}</small>
                </Col>
                <Col md={10} className="ps-md-5">
                  <Row>
                    <Col md={4}><Email className="text-primary" /> <strong>{userData.email}</strong></Col>
                    <Col md={4}><BadgeIcon className="text-primary" /> <Badge bg="info">{userData.role}</Badge></Col>
                    <Col md={4}><Business className="text-primary" /> <strong>{userData.department || "General"}</strong></Col>
                  </Row>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>

        {/* Files Table */}
        <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Header className={`py-3 ${isDark ? "bg-dark border-secondary" : "bg-white"}`}>
            <Row className="align-items-center">
              <Col md={6}><h5 className="mb-0"><Storage className="me-2 text-primary" /> User Storage</h5></Col>
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text className={isDark ? "bg-dark text-white border-secondary" : ""}><Search /></InputGroup.Text>
                  <Form.Control 
                    className={isDark ? "bg-dark text-white border-secondary" : ""}
                    placeholder="Search user files..." 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </InputGroup>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover className={`mb-0 ${isDark ? "table-dark" : ""}`}>
              <thead>
                <tr>
                  <th className="ps-4">#</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file, idx) => (
                  <tr key={file._id} style={{ opacity: file.isDisabled ? 0.6 : 1 }}>
                    <td className="ps-4 text-muted">{idx + 1}</td>
                    <td className={file.isDisabled ? "text-decoration-line-through text-muted" : "fw-bold"}>
                      {file.originalName} {file.isDisabled && <Badge bg="danger" className="ms-2">Disabled</Badge>}
                    </td>
                    <td>{(file.size / 1024).toFixed(2)} KB</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button variant="outline-primary" size="sm" onClick={() => handleViewFile(file)}><Visibility fontSize="small" /></Button>
                        {canManageFiles && (
                          <Button 
                            variant={file.isDisabled ? "outline-success" : "outline-danger"} 
                            size="sm" 
                            onClick={() => toggleFileStatus(file._id, file.isDisabled)}
                            title={file.isDisabled ? "Enable File" : "Disable File"}
                          >
                            {file.isDisabled ? <CheckCircle fontSize="small" /> : <Block fontSize="small" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFiles.length === 0 && !loading && (
                    <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">No files found for this user.</td>
                    </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default UserFilesView;