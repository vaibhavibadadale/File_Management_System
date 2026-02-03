import React, { useState } from "react";
import { Container, Card, Button, Row, Col, Alert, Form, InputGroup } from "react-bootstrap";
import { CloudDownload, Storage, VerifiedUser, ArrowBack, Timer, SdStorage } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const BackupPage = ({ currentTheme }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [backupInterval, setBackupInterval] = useState("daily");
  const isDark = currentTheme === "dark";

  const swalConfig = {
    background: isDark ? "#212529" : "#fff",
    color: isDark ? "#fff" : "#545454",
  };

  const handleSaveInterval = async () => {
    try {
      await axios.post("http://localhost:5000/api/files/settings", { 
        autoBackupInterval: backupInterval 
      });
      Swal.fire({
        ...swalConfig,
        icon: "success",
        title: "Schedule Updated",
        text: `Automatic backup set to ${backupInterval}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({ ...swalConfig, icon: "error", title: "Error", text: "Could not save schedule." });
    }
  };

  const handleDownloadBackup = async () => {
    Swal.fire({
      ...swalConfig,
      title: "Generate Full Backup?",
      text: "This will create a ZIP containing individual JSON files for every database collection and all physical uploads.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Start Backup",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsGenerating(true);

        try {
          // 1. Get current system size
          const statsRes = await axios.get("http://localhost:5000/api/files/storage-stats");
          const expectedSize = statsRes.data.totalSize;

          // 2. Perform Integrity Check
          const response = await axios.get("http://localhost:5000/api/files/system-backup-check");
          const actualBackupSize = response.data.backupSize;

          // If backup size is 0 or significantly wrong, throw error
          if (actualBackupSize <= 0 || actualBackupSize < (expectedSize * 0.5)) {
             throw new Error("Something went wrong: Backup size does not match database storage.");
          }

          // 3. If passed, trigger download
          const backupUrl = "http://localhost:5000/api/files/system-backup";
          window.location.href = backupUrl;

          Swal.fire({
            ...swalConfig,
            icon: "info",
            title: "Processing...",
            text: "Your backup is being prepared for download.",
            timer: 4000,
            showConfirmButton: false
          });

        } catch (err) {
          Swal.fire({
            ...swalConfig,
            icon: "error",
            title: "Backup Failed",
            text: err.response?.status === 404 ? "API endpoints missing on server." : err.message,
          });
        } finally {
          setTimeout(() => setIsGenerating(false), 6000);
        }
      }
    });
  };

  const dynamicInputStyle = isDark ? { backgroundColor: "#2b3035", color: "#ffffff", borderColor: "#495057" } : {};

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button 
          variant={isDark ? "outline-light" : "outline-primary"} 
          className="mb-4" 
          onClick={() => navigate(-1)}
        >
          <ArrowBack className="me-2" /> Back
        </Button>

        <Row className="justify-content-center">
          <Col md={8}>
            <Card className={`shadow-sm border-0 mb-4 ${isDark ? "bg-dark text-white" : ""}`}>
              <Card.Header className={`py-3 ${isDark ? "bg-dark border-secondary" : "bg-white"}`}>
                <h5 className="mb-0 d-flex align-items-center">
                  <Storage className="me-2 text-primary" /> System Backup Management
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Alert variant="info" className="d-flex align-items-center mb-4">
                  <VerifiedUser className="me-3" />
                  <div><strong>Collection-Wise Backup:</strong> Exports Users, Folders, and Files separately.</div>
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
                  <h3>Export All Collections</h3>
                  <Button variant="primary" size="lg" onClick={handleDownloadBackup} disabled={isGenerating} className="px-5 shadow-sm mb-3">
                    {isGenerating ? "Validating & Zipping..." : "Generate Full Backup"}
                  </Button>
                  <div className="small text-muted"><SdStorage fontSize="small" /> Integrity check will be performed.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default BackupPage;