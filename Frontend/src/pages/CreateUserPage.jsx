import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col, Card, Alert } from "react-bootstrap";
import axios from "axios";

const CreateUserPage = ({ currentTheme, user }) => {
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState(false);
  const isDark = currentTheme === "dark";

  const [formData, setFormData] = useState({
    name: "", email: "", departmentId: "", role: "", username: "", password: "",
  });

  useEffect(() => {
    axios.get("http://localhost:5000/api/departments").then(res => setDeptList(res.data));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // We pass the creator's role in the headers
      await axios.post("http://localhost:5000/api/users", formData, {
        headers: { "creator-role": user?.role || "employee" }
      });
      alert("✅ Success: User created!");
      setFormData({ name: "", email: "", departmentId: "", role: "", username: "", password: "" });
    } catch (err) {
      alert("❌ Error: " + (err.response?.data?.error || "Creation failed"));
    } finally { setLoading(false); }
  };

  const renderRoleOptions = () => {
    // Normalizing role to lowercase for comparison
    const myRole = (user?.role || "").toLowerCase();

    // 1. EMPLOYEES
    if (myRole === "employee") {
      return <option disabled>No permission to create users</option>;
    }

    return (
      <>
        <option value="">Select Role</option>
        
        {/* HOD, Admin, SuperAdmin can all create Employees */}
        <option value="Employee">Employee</option>

        {/* 2. ADMIN and SUPERADMIN can create HODs */}
        {(myRole === "admin" || myRole === "superadmin") && (
          <option value="HOD">HOD</option>
        )}

        {/* 3. ONLY SUPERADMIN can create Admins and other SuperAdmins */}
        {myRole === "superadmin" && (
          <>
            <option value="Admin">Admin</option>
            <option value="SuperAdmin">SuperAdmin</option>
          </>
        )}
      </>
    );
  };

  return (
    <div className={`p-4 ${isDark ? "bg-dark text-white" : ""}`}>
      {/* DEBUG ALERT: Check if this shows 'hod' */}
      <Alert variant="info" className="py-1">
        Logged in as: <strong>{user?.username}</strong> | Role: <strong>{user?.role || "Guest"}</strong>
      </Alert>

      <Card className={`p-4 border-0 shadow-sm ${isDark ? "bg-secondary text-white" : "bg-white"}`}>
        <h4>Create New User Account</h4>
        <hr />
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Full Name</Form.Label>
              <Form.Control name="name" onChange={handleChange} value={formData.name} required />
            </Col>
            <Col md={6}>
              <Form.Label>Office Email</Form.Label>
              <Form.Control name="email" type="email" onChange={handleChange} value={formData.email} required />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Department</Form.Label>
              <Form.Select name="departmentId" onChange={handleChange} value={formData.departmentId} required>
                <option value="">Select Department</option>
                {deptList.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Assign Role</Form.Label>
              <Form.Select name="role" onChange={handleChange} value={formData.role} required>
                {renderRoleOptions()}
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Username</Form.Label>
              <Form.Control name="username" onChange={handleChange} value={formData.username} required />
            </Col>
            <Col md={6}>
              <Form.Label>Temporary Password</Form.Label>
              <Form.Control name="password" type="password" onChange={handleChange} value={formData.password} required />
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button variant="primary" type="submit" className="px-5" disabled={loading}>
              {loading ? "Creating..." : "Create User Account"}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CreateUserPage;