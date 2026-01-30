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
      // 1. Get User Profile
      const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`);
      const profile = userRes.data;

      if (profile) {
        setUserData(profile);
        // 2. Get Files using the correct query parameter logic from your backend
        // We use all=true to see all files regardless of folder depth
        const fileRes = await axios.get(`http://localhost:5000/api/files?userId=${profile._id}&all=true`);
        
        // Extract the array from { files: [...] }
        const fileData = fileRes.data.files ? fileRes.data.files : fileRes.data;
        setFiles(Array.isArray(fileData) ? fileData : []);
      }
    } catch (err) {
      console.error("Error loading profile or files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchUserDataAndLogs();
  }, [userId]);

  const handleViewFile = (file) => {
    if (file.isDisabled && !canManageFiles) {
      Swal.fire({ 
        ...swalConfig, 
        icon: "error", 
        title: "Access Denied", 
        text: "This file has been disabled by an administrator." 
      });
      return;
    }
    const fileUrl = `http://localhost:5000/uploads/${userData?.username}/${file.name || file.filename}`;
    window.open(fileUrl, "_blank");
  };

  const toggleFileStatus = async (fileId, currentStatus) => {
    if (!fileId || fileId === "undefined") {
      return Swal.fire({ 
        ...swalConfig, 
        icon: "error", 
        title: "Error", 
        text: "File ID is missing. Please refresh the page." 
      });
    }

    const action = currentStatus ? "enable" : "disable";
    const result = await Swal.fire({
      ...swalConfig,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} File?`,
      text: `Are you sure you want to ${action} this file?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${action} it!`,
    });

    if (result.isConfirmed) {
      try {
        await axios.put(`http://localhost:5000/api/files/toggle-status/${fileId}`, {
          isDisabled: !currentStatus,
          adminId: user?._id || user?.id, 
        });
        
        Swal.fire({ 
          ...swalConfig, 
          icon: "success", 
          title: "Success", 
          text: `File ${action}d successfully.`, 
          timer: 1500, 
          showConfirmButton: false 
        });
        fetchUserDataAndLogs(); 
      } catch (err) {
        Swal.fire({ 
          ...swalConfig, 
          icon: "error", 
          title: "Error", 
          text: err.response?.data?.message || "Failed to update file status." 
        });
      }
    }
  };

  const filteredFiles = files.filter((file) =>
    (file.originalName || file.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button variant={isDark ? "outline-light" : "outline-primary"} className="mb-4" onClick={() => navigate(-1)}>
          <ArrowBack className="me-2" /> Back
        </Button>

        <Card className={`mb-4 shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Body className="p-4">
            {loading ? (
              <div className="text-center"><Spinner animation="border" variant="primary" /></div>
            ) : userData ? (
              <Row className="align-items-center">
                <Col md={2} className="text-center border-end">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-2">
                    <Person style={{ fontSize: "60px", color: "#0d6efd" }} />
                  </div>
                  <h5 className="mb-0 fw-bold">{userData.name}</h5>
                  <small className={isDark ? "text-light opacity-75" : "text-muted"}>@{userData.username}</small>
                </Col>
                <Col md={10} className="ps-md-5">
                  <h4 className="mb-4">Profile Overview</h4>
                  <Row>
                    <Col md={4} className="mb-3">
                      <Email className="text-primary me-2" />
                      <small className={`d-block ${isDark ? "text-light opacity-75" : "text-muted"}`}>Email</small>
                      <strong>{userData.email}</strong>
                    </Col>
                    <Col md={4} className="mb-3">
                      <BadgeIcon className="text-primary me-2" />
                      <small className={`d-block ${isDark ? "text-light opacity-75" : "text-muted"}`}>System Role</small>
                      <Badge bg="info" className="text-dark">{userData.role}</Badge>
                    </Col>
                    <Col md={4} className="mb-3">
                      <Business className="text-primary me-2" />
                      <small className={`d-block ${isDark ? "text-light opacity-75" : "text-muted"}`}>Department</small>
                      <strong>{userData.department || userData.departmentId?.departmentName || "General"}</strong>
                    </Col>
                  </Row>
                </Col>
              </Row>
            ) : <p className="text-center">Staff information not found.</p>}
          </Card.Body>
        </Card>

        <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Header className={`py-3 ${isDark ? "bg-dark border-secondary" : "bg-white"}`}>
            <Row className="align-items-center">
              <Col md={6}>
                <h5 className="mb-0 d-flex align-items-center">
                  <Storage className="me-2 text-primary" /> Storage History
                </h5>
              </Col>
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text className={isDark ? "bg-dark text-white border-secondary" : ""}>
                    <Search fontSize="small" />
                  </InputGroup.Text>
                  <Form.Control 
                    className={isDark ? "bg-dark text-white border-secondary" : ""}
                    placeholder="Search files..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </InputGroup>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
              <Table hover className={`mb-0 ${isDark ? "table-dark" : ""}`}>
                <thead>
                  <tr>
                    <th className="ps-4">#</th>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Date Created</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length > 0 ? filteredFiles.map((file, idx) => (
                    <tr 
                      key={file._id || idx} 
                      className="align-middle" 
                      style={{ opacity: file.isDisabled ? 0.7 : 1 }}
                    >
                      <td className="ps-4 text-muted">{idx + 1}</td>
                      <td className={file.isDisabled ? "text-muted text-decoration-line-through" : "fw-bold"}>
                        {file.originalName || file.name} 
                        {file.isDisabled && <Badge bg="danger" className="ms-2">Disabled</Badge>}
                      </td>
                      <td>{file.size ? (file.size / 1024).toFixed(2) + " KB" : "0 KB"}</td>
                      <td>{file.createdAt ? new Date(file.createdAt).toLocaleString() : "N/A"}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => handleViewFile(file)}
                            title="View File"
                          >
                            <Visibility fontSize="small" />
                          </Button>

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
                  )) : <tr><td colSpan="5" className="text-center py-5">No files found for this user.</td></tr>}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default UserFilesView;