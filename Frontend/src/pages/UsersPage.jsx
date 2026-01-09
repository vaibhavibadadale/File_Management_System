import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Badge, Row, Col } from "react-bootstrap";
import { Visibility, PersonAdd, RestartAlt } from "@mui/icons-material";
import { useNavigate } from "react-router-dom"; // Added for internal navigation
import axios from "axios";
import "../styles/VenturesPage.css"; 

const UsersPage = ({ currentTheme, user }) => {
  const navigate = useNavigate(); // Hook for navigation
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
    try {
      await axios.post("http://localhost:5000/api/users", 
        { ...formData, employeeId: `EMP-${Date.now()}` },
        { headers: { "creator-role": user?.role } }
      );
      alert(`User Created Successfully!`);
      setShowModal(false);
      setFormData({ name: "", email: "", department: "", departmentId: "", role: "", username: "", password: "" });
      fetchData();
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const toggleStatus = async (userId) => {
    if (!canManageStatus) {
      alert("Access Denied: Only Admins can change user status.");
      return;
    }
    try {
      await axios.put(`http://localhost:5000/api/users/status/${userId}`);
      fetchData(); 
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Error updating status");
    }
  };

  const renderRoleOptions = () => {
    if (!user) return <option value="">Loading permissions...</option>;
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
      Employee: { bg: "#007BFF", color: "#FFFFFF" }     
    };
    const style = roleStyles[role] || { bg: "#9e9e9e", color: "white" };
    return (
      <div style={{ 
        backgroundColor: style.bg, color: style.color, width: '100px', 
        padding: '6px 0', borderRadius: '4px', fontWeight: '500', 
        fontSize: '0.85rem', textAlign: 'center', display: 'inline-block'
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

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className={isDark ? "text-white" : "text-dark"}>User Management</h3>
        {myRole !== "employee" && (
          <Col md={2} className="px-0 text-end">
            <Button 
              variant="primary" 
              className="w-100 py-2 d-flex align-items-center justify-content-center" 
              onClick={() => setShowModal(true)}
              style={{ height: '45px' }} 
            >
              <PersonAdd className="me-2" fontSize="small" /> Add New User
            </Button>
          </Col>
        )}
      </div>

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
          <Button variant="outline-secondary" className="w-100 py-2 d-flex align-items-center justify-content-center" style={{ height: '45px' }} onClick={handleReset}>
            <RestartAlt className="me-1" /> Reset
          </Button>
        </Col>
      </Row>

      <div className={`card shadow-sm border-0 ${isDark ? "bg-dark" : ""}`}>
        <div className="table-responsive">
          <Table hover className={`mb-0 ${isDark ? "table-dark" : ""}`}>
            <thead>
              <tr style={{ fontSize: '0.9rem', fontWeight: '500' }}>
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
                <tr><td colSpan="6" className="text-center py-4">Loading Users...</td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="align-middle">
                    <td className="ps-4">{u.name}</td>
                    <td>{u.username}</td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>{u.department || "All"}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center">
                        <div 
                          className={`status-toggle-container ${u.isActive !== false ? "active" : "inactive"}`}
                          onClick={() => toggleStatus(u._id)}
                          style={{ cursor: canManageStatus ? 'pointer' : 'default' }}
                        >
                          <Badge 
                            bg={u.isActive !== false ? "success" : "danger"} 
                            className="status-badge d-flex align-items-center gap-1"
                            style={{ width: '85px', padding: '8px' }}
                          >
                            <div className="toggle-dot"></div>
                            {u.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      {/* UPDATED: Navigates using _id instead of username */}
                      <Button variant="outline-primary" size="sm" onClick={() => navigate(`/user-files/${u._id}`)}>
                        <Visibility fontSize="small" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No users found.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Modal remains same */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <div className={isDark ? "bg-dark text-white border border-secondary" : ""}>
          <Modal.Header closeButton closeVariant={isDark ? "white" : undefined}>
            <Modal.Title>Create New User</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control name="name" required value={formData.name} onChange={handleInputChange} />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Office Email</Form.Label>
                  <Form.Control name="email" type="email" required value={formData.email} onChange={handleInputChange} />
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Select name="departmentId" required value={formData.departmentId} onChange={handleInputChange}>
                    <option value="">Select Department</option>
                    {(myRole === "admin" || myRole === "superadmin") && (
                        <option value="ALL_DEPT">All (Admin/Super Admin)</option>
                    )}
                    {deptList.map((d) => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                  </Form.Select>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Assign Role</Form.Label>
                  <Form.Select name="role" required value={formData.role} onChange={handleInputChange}>
                    {renderRoleOptions()}
                  </Form.Select>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3"><Form.Label>Username</Form.Label><Form.Control name="username" required value={formData.username} onChange={handleInputChange}/></Col>
                <Col md={6} className="mb-3"><Form.Label>Password</Form.Label><Form.Control type="password" name="password" required value={formData.password} onChange={handleInputChange}/></Col>
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