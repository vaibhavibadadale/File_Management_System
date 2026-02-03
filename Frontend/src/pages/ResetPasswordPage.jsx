import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Card, Form, Button } from "react-bootstrap";
import { CheckCircleOutline, LockReset } from "@mui/icons-material";
import axios from "axios";
import Swal from "sweetalert2";

const ResetPasswordPage = ({ currentTheme }) => {
  const { token } = useParams();
  const isDark = currentTheme === "dark";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "Mismatch",
        text: "Passwords do not match!",
        background: isDark ? "#212529" : "#fff",
        color: isDark ? "#fff" : "#000",
      });
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:5000/api/users/complete-reset/${token}`, {
        password: password,
      });

      if (response.data.success) {
        setIsFinished(true); // Switch to the final message
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Something went wrong.",
        background: isDark ? "#212529" : "#fff",
        color: isDark ? "#fff" : "#000",
      });
    } finally {
      setLoading(false);
    }
  };

  const dynamicInputStyle = isDark 
    ? { backgroundColor: "#2b3035", color: "#ffffff", borderColor: "#495057" } 
    : {};

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
      <Card className={`shadow-lg border-0 ${isDark ? "bg-dark text-white" : ""}`} style={{ maxWidth: "450px", width: "100%", borderRadius: "15px" }}>
        <Card.Body className="p-5 text-center">
          
          {!isFinished ? (
            <>
              <div className="bg-primary d-inline-block p-3 rounded-circle mb-3">
                <LockReset style={{ fontSize: "40px", color: "white" }} />
              </div>
              <h3 className="mb-4">Set New Password</h3>

              <Form onSubmit={handleSubmit} className="text-start">
                <Form.Group className="mb-3">
                  <Form.Label>New Password:</Form.Label>
                  <Form.Control
                    type="password"
                    style={dynamicInputStyle}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Confirm Password:</Form.Label>
                  <Form.Control
                    type="password"
                    style={dynamicInputStyle}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100 py-2 fw-bold" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </Form>
            </>
          ) : (
            /* FINAL SUCCESS STATE */
            <div className="py-5">
              <CheckCircleOutline style={{ fontSize: "70px", color: "#28a745" }} className="mb-4" />
              <h3 className="fw-bold text-success">Password Updated Successfully!</h3>
              <p className="text-muted mt-3 fs-5">
                You can now safely close this window.
              </p>
            </div>
          )}
          
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPasswordPage;