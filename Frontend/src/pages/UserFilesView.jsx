import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Container, Card, Badge, Spinner, Button, Row, Col, Form, InputGroup } from "react-bootstrap";
import { Visibility, Person, Business, Email, Badge as BadgeIcon, Search, ArrowBack, Storage } from "@mui/icons-material";
import axios from "axios";

const UserFilesView = ({ currentTheme }) => {
  // 'username' here represents the :id param from the route
  const { username: userId } = useParams(); 
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

        // 1. Fetch User Profile from Database using the unique ID
        // This hits your backend: router.get("/:id", userController.getUserById)
        const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`);
        const profile = userRes.data;
        setUserData(profile);

        // 2. Fetch Files using the 'username' field inside the fetched profile
        // This hits your backend: router.get("/files/:username", userController.getUserFiles)
        if (profile && profile.username) {
            const fileRes = await axios.get(`http://localhost:5000/api/users/files/${profile.username}`);
            setFiles(fileRes.data);
        }
      } catch (err) {
        console.error("Error fetching user audit data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUserDataAndLogs();
  }, [userId]);

  const handleViewFile = (fileName) => {
    // Uses the username from the fetched database profile for the URL path
    const fileUrl = `http://localhost:5000/uploads/${userData.username}/${fileName}`;
    window.open(fileUrl, "_blank");
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button 
          variant={isDark ? "outline-light" : "outline-primary"} 
          className="mb-4" 
          onClick={() => navigate(-1)} // Go back to the Department List
        >
          <ArrowBack className="me-2" /> Back
        </Button>

        {/* PROFILE SECTION */}
        <Card className={`mb-4 shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Body className="p-4">
            <Row className="align-items-center">
              <Col md={2} className="text-center border-end">
                <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-2">
                  <Person style={{ fontSize: "60px", color: "#0d6efd" }} />
                </div>
                <h5 className="mb-0 fw-bold">{userData?.name || "User Profile"}</h5>
                <small className="text-muted">@{userData?.username || "loading..."}</small>
              </Col>
              
              <Col md={10} className="ps-md-5">
                <h4 className="mb-4">User Profile Details</h4>
                <Row>
                  <Col md={4} className="mb-3">
                    <Email className="text-primary me-2" />
                    <div>
                      <small className="text-muted d-block">Email</small>
                      <strong>{userData?.email || "N/A"}</strong>
                    </div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <BadgeIcon className="text-primary me-2" />
                    <div>
                      <small className="text-muted d-block">Role</small>
                      <Badge bg="info" className="text-dark">{userData?.role || "Employee"}</Badge>
                    </div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <Business className="text-primary me-2" />
                    <div>
                      <small className="text-muted d-block">Department</small>
                      <strong>{userData?.department || "General"}</strong>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* FILES TABLE */}
        <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
          <Card.Header className={`py-3 bg-white ${isDark ? "bg-dark border-secondary" : ""}`}>
            <Row className="align-items-center">
              <Col md={6}>
                <h5 className="mb-0 d-flex align-items-center">
                  <Storage className="me-2 text-primary" /> 
                  User File Storage <Badge bg="primary" className="ms-2 fs-6">{files.length}</Badge>
                </h5>
              </Col>
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text className={isDark ? "bg-dark text-white border-secondary" : "bg-light border-end-0"}>
                    <Search size={18} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search files..."
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
              <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
              <div className="table-responsive">
                <Table hover className={`mb-0 ${isDark ? "table-dark" : ""}`}>
                  <thead className={isDark ? "table-dark" : "table-light"}>
                    <tr>
                      <th className="ps-4">#</th>
                      <th>File Name</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file, idx) => (
                        <tr key={idx} className="align-middle">
                          <td className="ps-4 text-muted">{idx + 1}</td>
                          <td className="fw-bold">{file.name}</td>
                          <td className="text-center">
                            <Button variant="outline-primary" size="sm" onClick={() => handleViewFile(file.name)}>
                              <Visibility size={16} className="me-1" /> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="text-center py-5 text-muted">No files found in folder.</td></tr>
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