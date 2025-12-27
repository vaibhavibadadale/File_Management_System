import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Badge, Row, Col } from "react-bootstrap";
import { Visibility, ToggleOn, ToggleOff, RestartAlt } from "@mui/icons-material";
import axios from "axios";

const UsersPage = ({ currentTheme }) => {
  const [users, setUsers] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    departmentId: "",
    role: "",
    username: "",
    password: "",
  });

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

  useEffect(() => { fetchData(); }, []);

  const getRoleBadge = (role) => {
    const roleStyles = {
      SuperAdmin: { bg: "#FF0000", color: "#FFFFFF" }, 
      Admin: { bg: "#FF0000", color: "#FFFFFF" },      
      HOD: { bg: "#000000", color: "#FFFFFF" },        
      Employee: { bg: "#007BFF", color: "#FFFFFF" }     
    };

    const style = roleStyles[role] || { bg: "#9e9e9e", color: "white" };

    return (
      <div style={{ 
        backgroundColor: style.bg, 
        color: style.color, 
        width: '100px', 
        padding: '6px 0',
        borderRadius: '4px',
        fontWeight: '500', 
        fontSize: '0.85rem', 
        textAlign: 'center',
        display: 'inline-block'
      }}>
        {role}
      </div>
    );
  };

  const handleReset = () => {
    setSearchTerm("");
    setFilterDept("");
    setFilterRole("");
  };

  const toggleStatus = async (userId) => {
    try {
      await axios.patch(`http://localhost:5000/api/users/toggle-status/${userId}`);
      fetchData(); 
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const viewUserFiles = (username) => {
    window.open(`/user-files/${username}`, "_blank");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "departmentId") {
      const selectedDept = deptList.find((d) => d._id === value);
      setFormData({
        ...formData,
        departmentId: value,
        department: selectedDept ? selectedDept.departmentName : "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/users", {
        ...formData,
        employeeId: `EMP-${Date.now()}`,
      });
      alert(`User Created Successfully!`);
      setShowModal(false);
      setFormData({ name: "", email: "", department: "", departmentId: "", role: "", username: "", password: "" });
      fetchData();
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === "" || u.department === filterDept;
    const matchesRole = filterRole === "" || u.role === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  const isDark = currentTheme === "dark";

  const tableTextStyle = {
    fontSize: '0.9rem',
    fontWeight: '500',
    fontFamily: 'inherit'
  };

  return (
    <div className="p-4">
      {/* Header with Working "Add New User" Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className={isDark ? "text-white" : "text-dark"}>User Management</h3>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="fa fa-plus me-2"></i> Add New User
        </Button>
      </div>

      {/* Filter Section */}
      <Row className="mb-4 g-2 align-items-center">
        <Col md={4}>
          <Form.Control
            placeholder="Search name or username..."
            value={searchTerm}
            className={isDark ? "bg-dark text-white border-secondary" : ""}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select 
            value={filterDept}
            className={isDark ? "bg-dark text-white border-secondary" : ""}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {deptList.map(d => <option key={d._id} value={d.departmentName}>{d.departmentName}</option>)}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select 
            value={filterRole}
            className={isDark ? "bg-dark text-white border-secondary" : ""}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="SuperAdmin">SuperAdmin</option>
            <option value="Admin">Admin</option>
            <option value="HOD">HOD</option>
            <option value="Employee">Employee</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" className="w-100" onClick={handleReset}>
             Reset
          </Button>
        </Col>
      </Row>

      {/* User Table Section */}
      <div className={`card shadow-sm border-0 ${isDark ? "bg-dark" : ""}`}>
        <div className="table-responsive">
          <Table hover className={`mb-0 ${isDark ? "table-dark" : ""}`}>
            <thead className={isDark ? "table-dark" : "table-light"}>
              <tr style={tableTextStyle}>
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
                <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="align-middle" style={tableTextStyle}>
                    <td className="ps-4">{user.name}</td>
                    <td>{user.username}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{user.department || "General"}</td>
                    <td className="text-center">
                      <div style={{ cursor: 'pointer' }} onClick={() => toggleStatus(user._id)}>
                        <Badge 
                          bg={user.isActive !== false ? "success" : "danger"} 
                          className="p-2 d-flex align-items-center justify-content-center mx-auto"
                          style={{ width: '85px', fontSize: '0.8rem', fontWeight: '500' }}
                        >
                          {user.isActive !== false ? <><ToggleOn className="me-1"/> Active</> : <><ToggleOff className="me-1"/> Inactive</>}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-center">
                      <Button variant="outline-primary" size="sm" onClick={() => viewUserFiles(user.username)}>
                        <Visibility fontSize="small" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-4">No records found.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* MODAL: Create New User (Fixed and Integrated) */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <div className={isDark ? "bg-dark text-white border border-secondary rounded" : ""}>
          <Modal.Header closeButton closeVariant={isDark ? "white" : undefined}>
            <Modal.Title>Create New User</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control 
                    name="name" required 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className={isDark ? "bg-dark text-white border-secondary" : ""} 
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Office Email</Form.Label>
                  <Form.Control 
                    type="email" name="email" required 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    className={isDark ? "bg-dark text-white border-secondary" : ""} 
                  />
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Select 
                    name="departmentId" required 
                    value={formData.departmentId} 
                    onChange={handleInputChange} 
                    className={isDark ? "bg-dark text-white border-secondary" : ""}
                  >
                    <option value="">Select Department</option>
                    {deptList.map((d) => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                  </Form.Select>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Assign Role</Form.Label>
                  <Form.Select 
                    name="role" required 
                    value={formData.role} 
                    onChange={handleInputChange} 
                    className={isDark ? "bg-dark text-white border-secondary" : ""}
                  >
                    <option value="">Select Role</option>
                    <option value="Employee">Employee</option>
                    <option value="HOD">HOD</option>
                    <option value="Admin">Admin</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                  </Form.Select>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control 
                    name="username" required 
                    value={formData.username} 
                    onChange={handleInputChange} 
                    className={isDark ? "bg-dark text-white border-secondary" : ""} 
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" name="password" required 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    className={isDark ? "bg-dark text-white border-secondary" : ""} 
                  />
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