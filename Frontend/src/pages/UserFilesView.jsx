import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Container, Card, Badge, Spinner, Button, Row, Col, Form, InputGroup } from "react-bootstrap";
import { Visibility, Person, Business, Email, Badge as BadgeIcon, Search, ArrowBack, Storage } from "@mui/icons-material";
import axios from "axios";

const UserFilesView = ({ currentTheme }) => {
  const { username } = useParams();
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
        // 1. Fetch File Logs from physical directory
        const fileRes = await axios.get(`http://localhost:5000/api/users/files/${username}`);
        setFiles(fileRes.data);

        // 2. Fetch User Profile Details
        const userRes = await axios.get("http://localhost:5000/api/users");
        const profile = userRes.data.find((u) => u.username === username);
        setUserData(profile);
      } catch (err) {
        console.error("Error fetching user audit data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDataAndLogs();
  }, [username]);

  // Handle viewing the file
  const handleViewFile = (fileName) => {
    const fileUrl = `http://localhost:5000/uploads/${username}/${fileName}`;
    window.open(fileUrl, "_blank");
  };

  // Filter files based on search input
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        {/* Navigation & Back Button */}
        <Button 
          variant={isDark ? "outline-light" : "outline-primary"} 
          className="mb-4" 
          onClick={() => window.close()}
        >
          <ArrowBack className="me-2" /> Back to User Management
        </Button>

        {/* --- SECTION 1: USER INFORMATION PROFILE --- */}
        <Card className={`mb-4 shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Body className="p-4">
            <Row className="align-items-center">
              <Col md={2} className="text-center border-end">
                <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-2">
                  <Person style={{ fontSize: "60px", color: "#0d6efd" }} />
                </div>
                <h5 className="mb-0 fw-bold">{userData?.name || "System User"}</h5>
                <small className="text-muted">@{username}</small>
              </Col>
              
              <Col md={10} className="ps-md-5">
                <h4 className="mb-4">User Profile Details</h4>
                <Row>
                  <Col md={4} className="mb-3">
                    <div className="d-flex align-items-center">
                      <Email className="text-primary me-2" />
                      <div>
                        <small className="text-muted d-block">Email Address</small>
                        <strong>{userData?.email || "N/A"}</strong>
                      </div>
                    </div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <div className="d-flex align-items-center">
                      <BadgeIcon className="text-primary me-2" />
                      <div>
                        <small className="text-muted d-block">Designated Role</small>
                        <Badge bg="info" className="text-dark">{userData?.role || "Employee"}</Badge>
                      </div>
                    </div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <div className="d-flex align-items-center">
                      <Business className="text-primary me-2" />
                      <div>
                        <small className="text-muted d-block">Department</small>
                        <strong>{userData?.department || "General"}</strong>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* --- SECTION 2: FILE LOGS WITH SEARCH --- */}
        <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Header className={`py-3 bg-white ${isDark ? "bg-dark border-secondary" : ""}`}>
            <Row className="align-items-center">
              <Col md={6}>
                <h5 className="mb-0 d-flex align-items-center">
                  <Storage className="me-2 text-primary" /> 
                  File Storage Logs 
                  <Badge bg="primary" className="ms-2 fs-6">{files.length}</Badge>
                </h5>
              </Col>
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text className={isDark ? "bg-dark text-white border-secondary" : "bg-light border-end-0"}>
                    <Search size={18} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search file name..."
                    className={isDark ? "bg-dark text-white border-secondary" : "bg-light border-start-0"}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
            </Row>
          </Card.Header>
          
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Scanning storage directory...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className={`mb-0 ${isDark ? "table-dark" : ""}`}>
                  <thead className={isDark ? "table-dark" : "table-light"}>
                    <tr>
                      <th className="ps-4">#</th>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Creation Date</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file, idx) => (
                        <tr key={idx} className="align-middle">
                          <td className="ps-4 text-muted">{idx + 1}</td>
                          <td className="fw-bold">{file.name}</td>
                          <td><Badge bg="secondary" text="white">{file.size}</Badge></td>
                          <td>{new Date(file.createdAt).toLocaleString()}</td>
                          <td className="text-center">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleViewFile(file.name)}
                            >
                              <Visibility size={16} className="me-1" /> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-5 text-muted">
                          No matching files found in the directory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default UserFilesView;