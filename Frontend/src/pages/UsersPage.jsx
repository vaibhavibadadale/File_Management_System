import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Badge, Row, Col } from "react-bootstrap";
import { Visibility, PersonAdd, RestartAlt } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/VenturesPage.css";

const UsersPage = ({ currentTheme, user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const isDark = currentTheme === "dark";
  const myRole = (user?.role || "").toLowerCase();
  const canManageStatus = myRole === "admin" || myRole === "superadmin";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    departmentId: "",
    role: "",
    username: "",
    password: "",
  });

  const rolePrefixes = {
    HOD: "h-",
    Admin: "a-",
    Employee: "e-",
    SuperAdmin: "s-",
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, deptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/users"),
        axios.get("http://localhost:5000/api/departments"),
      ]);
      setUsers(userRes.data);
      setDeptList(deptRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setFilterDept("");
    setFilterRole("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "departmentId") {
      if (value === "ALL_DEPT") {
        setFormData({ ...formData, departmentId: "ALL_DEPT", department: "All" });
      } else {
        const selectedDept = deptList.find((d) => d._id === value);
        setFormData({
          ...formData,
          departmentId: value,
          department: selectedDept ? selectedDept.departmentName : "",
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredPrefix = rolePrefixes[formData.role];
    if (requiredPrefix && !formData.username.startsWith(requiredPrefix)) {
      alert(`Invalid Username! For role "${formData.role}", the username must start with "${requiredPrefix}"`);
      return; 
    }

    try {
      // The payload must strictly match the "required" fields in your Mongoose model
      const payload = {
        name: formData.name,           
        email: formData.email,         
        username: formData.username,   
        password: formData.password,   
        role: formData.role,           
        department: formData.department,
        departmentId: formData.departmentId === "ALL_DEPT" ? null : formData.departmentId,
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}` // Short unique ID
      };

      await axios.post(
        "http://localhost:5000/api/users",
        payload,
        { headers: { "creator-role": user?.role } }
      );

      alert(`User Created Successfully!`);
      setShowModal(false);
      setFormData({
        name: "",
        email: "",
        department: "",
        departmentId: "",
        role: "",
        username: "",
        password: "",
      });
      fetchData();
    } catch (err) {
      // This will alert the specific validation error from Mongoose
      const errorMsg = err.response?.data?.error || err.message;
      alert("Registration Error: " + errorMsg);
    }
  };

  const toggleStatus = async (userId) => {
    if (!canManageStatus) return;
    try {
      await axios.put(`http://localhost:5000/api/users/status/${userId}`);
      fetchData();
    } catch (err) {
      alert("Error updating status");
    }
  };

  const renderRoleOptions = () => {
    return (
      <>
        <option value="">Select Role</option>
        <option value="Employee">Employee</option>
        {(myRole === "admin" || myRole === "superadmin") && <option value="HOD">HOD</option>}
        {myRole === "superadmin" && (
          <>
            <option value="Admin">Admin</option>
            <option value="SuperAdmin">SuperAdmin</option>
          </>
        )}
      </>
    );
  };

  const getRoleBadge = (role) => {
    const roleStyles = {
      SuperAdmin: { bg: "#FF0000", color: "#FFFFFF" },
      Admin: { bg: "#FF0000", color: "#FFFFFF" },
      HOD: { bg: "#000000", color: "#FFFFFF" },
      Employee: { bg: "#007BFF", color: "#FFFFFF" },
    };
    const style = roleStyles[role] || { bg: "#9e9e9e", color: "white" };
    return (
      <div style={{
          backgroundColor: style.bg, color: style.color,
          width: "100px", padding: "6px 0", borderRadius: "4px",
          fontWeight: "500", fontSize: "0.85rem", textAlign: "center", display: "inline-block",
        }}>
        {role}
      </div>
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.username || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === "" || u.department === filterDept;
    const matchesRole = filterRole === "" || u.role === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  const dynamicInputStyle = isDark ? { backgroundColor: "#2b3035", color: "#ffffff", borderColor: "#495057" } : {};

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className={isDark ? "text-white" : "text-dark"}>User Management</h3>
        {myRole !== "employee" && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <PersonAdd className="me-2" /> Add New User
          </Button>
        )}
      </div>

      <Row className="mb-4 g-2">
        <Col md={4}>
          <Form.Control
            placeholder="Search name..."
            value={searchTerm}
            style={dynamicInputStyle}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={filterDept} style={dynamicInputStyle} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {deptList.map((d) => <option key={d._id} value={d.departmentName}>{d.departmentName}</option>)}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={filterRole} style={dynamicInputStyle} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="SuperAdmin">SuperAdmin</option>
            <option value="Admin">Admin</option>
            <option value="HOD">HOD</option>
            <option value="Employee">Employee</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" className="w-100" onClick={handleReset}><RestartAlt /> Reset</Button>
        </Col>
      </Row>

      <div className={`card shadow-sm border-0 ${isDark ? "bg-dark" : ""}`}>
        <Table hover className={isDark ? "table-dark" : ""}>
          <thead>
            <tr>
              <th className="ps-4">Full Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Department</th>
              <th className="text-center">Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center">Loading...</td></tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u._id} className="align-middle">
                  <td className="ps-4">{u.name}</td>
                  <td>{u.username}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>{u.department || "All"}</td>
                  <td className="text-center">
                    <Badge 
                       bg={u.isActive !== false ? "success" : "danger"}
                       onClick={() => toggleStatus(u._id)}
                       style={{ cursor: canManageStatus ? "pointer" : "default" }}
                    >
                      {u.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Button variant="outline-primary" size="sm" onClick={() => navigate(`/user-files/${u._id}`)}>
                      <Visibility fontSize="small" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <div className={isDark ? "bg-dark text-white" : ""}>
          <Modal.Header closeButton closeVariant={isDark ? "white" : undefined}>
            <Modal.Title>Create New User</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control name="name" required style={dynamicInputStyle} value={formData.name} onChange={handleInputChange} />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Office Email</Form.Label>
                  <Form.Control name="email" type="email" required style={dynamicInputStyle} value={formData.email} onChange={handleInputChange} />
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Select name="departmentId" required style={dynamicInputStyle} value={formData.departmentId} onChange={handleInputChange}>
                    <option value="">Select Department</option>
                    {(myRole === "admin" || myRole === "superadmin") && <option value="ALL_DEPT">All (Admin/Super Admin)</option>}
                    {deptList.map((d) => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                  </Form.Select>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Assign Role</Form.Label>
                  <Form.Select name="role" required style={dynamicInputStyle} value={formData.role} onChange={handleInputChange}>
                    {renderRoleOptions()}
                  </Form.Select>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control 
                    name="username" required style={dynamicInputStyle} 
                    placeholder={formData.role ? `Must start with ${rolePrefixes[formData.role]}` : ""}
                    value={formData.username} onChange={handleInputChange} 
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" name="password" required style={dynamicInputStyle} value={formData.password} onChange={handleInputChange} />
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Create User Account</Button>
            </Modal.Footer>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;