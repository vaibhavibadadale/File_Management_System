import React, { useState, useEffect, useRef } from "react";
import { Container, Card, Button, Row, Col, Alert, Form, InputGroup, Table } from "react-bootstrap";
import { CloudDownload, Storage, VerifiedUser, ArrowBack, Timer, SdStorage, History, Download } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const BackupPage = ({ currentTheme }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [backupInterval, setBackupInterval] = useState("daily");
  const [backupHistory, setBackupHistory] = useState([]);
  const isDark = currentTheme === "dark";
  
  const user = JSON.parse(sessionStorage.getItem("userSession") || "{}");
  const isAdmin = ["admin", "superadmin"].includes(user.role?.toLowerCase());

  const swalConfig = {
    background: isDark ? "#212529" : "#fff",
    color: isDark ? "#fff" : "#545454",
  };

  const fetchBackupHistory = async () => {
    if (!isAdmin) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/backup/list?role=${user.role}`);
      setBackupHistory(res.data.backups);
    } catch (err) {
      console.error("Could not fetch backup history");
    }
  };

  useEffect(() => {
    fetchBackupHistory();
  }, []);

  // UPDATED: This now updates the Server-Side schedule
  const handleSaveInterval = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/backup/update-schedule", { 
        interval: backupInterval 
      });

      if (res.data.success) {
        Swal.fire({
          ...swalConfig,
          icon: "success",
          title: "Schedule Updated",
          text: `The server will now backup automatically: ${backupInterval}.`,
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire({ ...swalConfig, icon: "error", title: "Error", text: "Could not sync schedule with server." });
    }
  };

  const handleDownloadBackup = async (isAuto = false) => {
    const triggerBackup = async () => {
        setIsGenerating(true);
        try {
          // Trigger the zip generation and download
          const backupUrl = "http://localhost:5000/api/backup/system-backup";
          window.location.href = backupUrl;

          Swal.fire({
            ...swalConfig,
            icon: "info",
            title: "Processing...",
            text: "Your full system backup is being prepared.",
            timer: 4000,
            showConfirmButton: false
          });

          setTimeout(fetchBackupHistory, 7000);
        } catch (err) {
          Swal.fire({ ...swalConfig, icon: "error", title: "Backup Failed", text: err.message });
        } finally {
          setTimeout(() => setIsGenerating(false), 6000);
        }
    };

    Swal.fire({
        ...swalConfig,
        title: "Generate Full Backup?",
        text: "This exports all database collections and physical uploads.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Start",
      }).then((result) => {
        if (result.isConfirmed) triggerBackup();
      });
  };

  const dynamicInputStyle = isDark ? { backgroundColor: "#2b3035", color: "#ffffff", borderColor: "#495057" } : {};

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button variant={isDark ? "outline-light" : "outline-primary"} className="mb-4" onClick={() => navigate(-1)}>
          <ArrowBack className="me-2" /> Back
        </Button>

        <Row className="justify-content-center">
          <Col md={10}>
            <Card className={`shadow-sm border-0 mb-4 ${isDark ? "bg-dark text-white" : ""}`}>
              <Card.Header className={`py-3 ${isDark ? "bg-dark border-secondary" : "bg-white"}`}>
                <h5 className="mb-0 d-flex align-items-center">
                  <Storage className="me-2 text-primary" /> System Backup Management
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Alert variant="info" className="d-flex align-items-center mb-4">
                  <VerifiedUser className="me-3" />
                  <div><strong>Full System Export:</strong> Contains DB Collections (.json) and Uploaded Files.</div>
                </Alert>

                <div className="mb-4">
                  <h6 className="d-flex align-items-center mb-3">
                    <Timer className="me-2 text-warning" /> Automatic Backup Interval
                  </h6>
                  <InputGroup>
                    <Form.Select style={dynamicInputStyle} value={backupInterval} onChange={(e) => setBackupInterval(e.target.value)}>
                      <option value="hourly">Every Hour</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </Form.Select>
                    <Button variant="outline-primary" onClick={handleSaveInterval}>Update Schedule</Button>
                  </InputGroup>
                </div>

                <hr className={isDark ? "border-secondary" : ""} />

                <div className="text-center py-4">
                  <div className={`rounded-circle d-inline-flex p-4 mb-4 ${isDark ? "bg-secondary" : "bg-primary bg-opacity-10"}`}>
                    <CloudDownload style={{ fontSize: "60px", color: "#0d6efd" }} />
                  </div>
                  <h3>Generate Manual Backup</h3>
                  <Button variant="primary" size="lg" onClick={() => handleDownloadBackup()} disabled={isGenerating} className="px-5 shadow-sm mb-3">
                    {isGenerating ? "Processing..." : "Start Full Backup"}
                  </Button>
                </div>

                {isAdmin && (
                  <div className="mt-5">
                    <h5 className="mb-3 d-flex align-items-center">
                      <History className="me-2 text-info" /> Server Backup History
                    </h5>
                    <div className="table-responsive">
                      <Table variant={isDark ? "dark" : "light"} hover responsive className="text-center align-middle">
                        <thead>
                          <tr>
                            <th>Generated Date</th>
                            <th>File Name</th>
                            <th>Size</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backupHistory.length > 0 ? (
                            backupHistory.map((item, index) => (
                              <tr key={index}>
                                <td>{new Date(item.createdAt).toLocaleString()}</td>
                                <td className="small text-muted">{item.name}</td>
                                <td>{item.size}</td>
                                <td>
                                  <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    href={`http://localhost:5000/api/backup/download/${item.name}?role=${user.role}`}
                                  >
                                    <Download fontSize="small" /> Download
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-muted py-3">No automatic backups found on server.</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container> 
  );
};

export default BackupPage;