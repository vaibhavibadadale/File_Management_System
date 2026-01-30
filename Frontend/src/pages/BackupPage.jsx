import React, { useState } from "react";
import { Container, Card, Button, Row, Col, Alert } from "react-bootstrap";
import { CloudDownload, Storage, VerifiedUser, ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const BackupPage = ({ currentTheme }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const isDark = currentTheme === "dark";

  const swalConfig = {
    background: isDark ? "#212529" : "#fff",
    color: isDark ? "#fff" : "#545454",
  };

  const handleDownloadBackup = () => {
    Swal.fire({
      ...swalConfig,
      title: "Generate Full Backup?",
      text: "This will create a ZIP containing individual JSON files for every database collection and all physical uploads.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Start Backup",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsGenerating(true);
        
        const backupUrl = "http://localhost:5000/api/files/system-backup";
        window.location.href = backupUrl;

        Swal.fire({
          ...swalConfig,
          icon: "info",
          title: "Processing Collection Data...",
          text: "Your multi-collection backup is being prepared.",
          timer: 4000,
          showConfirmButton: false
        });
        
        setTimeout(() => setIsGenerating(false), 6000);
      }
    });
  };

  return (
    <Container fluid className={`py-4 ${isDark ? "bg-secondary" : "bg-light"}`} style={{ minHeight: "100vh" }}>
      <div className="container">
        <Button 
          variant={isDark ? "outline-light" : "outline-primary"} 
          className="mb-4" 
          onClick={() => navigate(-1)}
        >
          <ArrowBack className="me-2" /> Back to Dashboard
        </Button>

        <Row className="justify-content-center">
          <Col md={8}>
            <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
              <Card.Header className={`py-3 ${isDark ? "bg-dark border-secondary" : "bg-white"}`}>
                <h5 className="mb-0 d-flex align-items-center">
                  <Storage className="me-2 text-primary" /> System Backup Management
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Alert variant="info" className="d-flex align-items-center">
                  <VerifiedUser className="me-3" />
                  <div>
                    <strong>Collection-Wise Backup:</strong> This method exports Users, Folders, and Files into separate files for safer recovery.
                  </div>
                </Alert>

                <div className="text-center py-5">
                  <div className={`rounded-circle d-inline-flex p-4 mb-4 ${isDark ? "bg-secondary" : "bg-primary bg-opacity-10"}`}>
                    <CloudDownload style={{ fontSize: "60px", color: "#0d6efd" }} />
                  </div>
                  <h3>Export All Collections</h3>
                  <p className="text-muted mb-4 px-md-5">
                    Download a full ZIP archive containing the <code>/database</code> folder (JSON per collection) 
                    and the <code>/user_files</code> folder (all uploads).
                  </p>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleDownloadBackup}
                    disabled={isGenerating}
                    className="px-5 shadow-sm"
                  >
                    {isGenerating ? "Zipping Collections..." : "Generate Full Backup"}
                  </Button>
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