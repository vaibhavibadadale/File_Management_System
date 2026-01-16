import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Container, Card, Badge, Spinner, Button, Row, Col, Form, InputGroup } from "react-bootstrap";
import { Visibility, Person, Business, Email, Badge as BadgeIcon, Search, ArrowBack, Storage } from "@mui/icons-material";
import axios from "axios";

const UserFilesView = ({ currentTheme }) => {
  const { userId } = useParams(); 
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isDark = currentTheme === "dark";

  useEffect(() => {
    const fetchUserDataAndLogs = async () => {
      try {
        setLoading(true);
        // 1. Fetch full database profile using ID from URL params
        const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`);
        const profile = userRes.data;
        
        if (profile) {
          setUserData(profile);
          // 2. Fetch files using the username obtained from the database record
          const fileRes = await axios.get(`http://localhost:5000/api/users/files/${profile.username}`);
          setFiles(Array.isArray(fileRes.data) ? fileRes.data : []);
        }
      } catch (err) {
        console.error("Error loading profile or files:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchUserDataAndLogs();
  }, [userId]);

  const handleViewFile = (fileName) => {
    const fileUrl = `http://localhost:5000/uploads/${userData?.username}/${fileName}`;
    window.open(fileUrl, "_blank");
  };

  const filteredFiles = files.filter((file) =>
    file.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button variant={isDark ? "outline-light" : "outline-primary"} className="mb-4" onClick={() => navigate(-1)}>
          <ArrowBack className="me-2" /> Back
        </Button>

        {/* PROFILE SECTION */}
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
                      {/* Updated conditional class for visibility in dark mode */}
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
                  <Row>
                    <Col md={4}>
                      <small className={`d-block ${isDark ? "text-light opacity-75" : "text-muted"}`}>Employee ID</small>
                      <span className="fw-bold">{userData.employeeId || "N/A"}</span>
                    </Col>
                    <Col md={4}>
                      <small className={`d-block ${isDark ? "text-light opacity-75" : "text-muted"}`}>Status</small>
                      <Badge bg={userData.isActive !== false ? "success" : "danger"}>
                        {userData.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </Col>
                  </Row>
                </Col>
              </Row>
            ) : <p className="text-center">Staff information not found.</p>}
          </Card.Body>
        </Card>

        {/* FILES SECTION */}
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
                    <tr key={idx} className="align-middle">
                      <td className="ps-4 text-muted">{idx + 1}</td>
                      <td className="fw-bold">{file.name}</td>
                      <td>{file.size}</td>
                      <td>{file.createdAt ? new Date(file.createdAt).toLocaleString() : "N/A"}</td>
                      <td className="text-center">
                        <Button variant="outline-primary" size="sm" onClick={() => handleViewFile(file.name)}>
                          <Visibility fontSize="small" />
                        </Button>
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