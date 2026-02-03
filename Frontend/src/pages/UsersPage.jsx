import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Badge, Row, Col } from "react-bootstrap";
import { Visibility, PersonAdd, RestartAlt, LockReset } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2"; 
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
  const myDepartment = user?.department; 
  
  // Logic: HOD, Admin, and SuperAdmin can manage status and trigger resets
  const canManageStatus = myRole === "admin" || myRole === "superadmin" || myRole === "hod";

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

  const swalConfig = {
    background: isDark ? "#212529" : "#fff",
    color: isDark ? "#fff" : "#545454",
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, deptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/users"),
        axios.get("http://localhost:5000/api/departments"),
      ]);

      let allUsers = userRes.data;

      if (myRole === "hod") {
        allUsers = allUsers.filter(u => 
          u.department === myDepartment && 
          (u.role || "").toLowerCase() === "employee"
        );
      }

      setUsers(allUsers);
      setDeptList(deptRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [myRole, myDepartment]);

  // --- EMAIL TRIGGER LOGIC (As per your requirement) ---
  const handleAdminTriggerReset = async (targetUserId, targetUsername) => {
    const confirm = await Swal.fire({
      ...swalConfig,
      title: 'Authorize Password Reset?',
      text: `Confirming will send a secure reset link to ${targetUsername}. They will use the Reset Password Page to set their new password.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ffc107',
      confirmButtonText: 'Yes, Send Email'
    });

    if (confirm.isConfirmed) {
      try {
        // Hits the endpoint that triggers the email sending logic
        const response = await axios.post("http://localhost:5000/api/users/admin-trigger-reset", {
          targetUserId,
          adminId: user?._id 
        });

        if (response.data.success) {
          Swal.fire({ 
            ...swalConfig, 
            icon: 'success', 
            title: 'Email Sent', 
            text: `A reset link has been successfully sent to ${targetUsername}.` 
          });
        }
      } catch (error) {
        Swal.fire({ 
          ...swalConfig, 
          icon: 'error', 
          title: 'Action Failed', 
          text: error.response?.data?.message || "Internal Server Error" 
        });
      }
    }
  };

  const handleReset2FA = async (targetUserId, targetUsername) => {
    const confirm = await Swal.fire({
      ...swalConfig,
      title: 'Reset 2FA?',
      text: `Are you sure you want to reset 2FA for ${targetUsername}? They will need to scan a new QR code on next login.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, Reset Key'
    });

    if (confirm.isConfirmed) {
      try {
        const response = await axios.post("http://localhost:5000/api/users/reset-2fa", {
          targetUserId,
          adminId: user?._id 
        });

        if (response.data.success) {
          Swal.fire({ ...swalConfig, icon: 'success', title: 'Reset Successful', text: response.data.message });
        }
      } catch (error) {
        Swal.fire({ 
          ...swalConfig, 
          icon: 'error', 
          title: 'Reset Failed', 
          text: error.response?.data?.message || "Internal Server Error" 
        });
      }
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setFilterDept("");
    setFilterRole("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "departmentId") {
      if (value === "ALL_DEPT" && myRole === "superadmin") {
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
      Swal.fire({
        ...swalConfig,
        icon: 'warning',
        title: 'Invalid Username',
        text: `For role "${formData.role}", the username must start with "${requiredPrefix}"`,
      });
      return; 
    }

    try {
      const payload = {
        name: formData.name,           
        email: formData.email,         
        username: formData.username,   
        password: formData.password,   
        role: formData.role,           
        department: formData.department,
        departmentId: formData.departmentId === "ALL_DEPT" ? null : formData.departmentId,
        employeeId: `EMP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}` 
      };

      await axios.post(
        "http://localhost:5000/api/users",
        payload,
        { headers: { "creator-role": user?.role } }
      );

      Swal.fire({
        ...swalConfig,
        icon: 'success',
        title: 'Success!',
        text: 'User Account Created Successfully',
        timer: 2000,
        showConfirmButton: false
      });

      setShowModal(false);
      setFormData({
        name: "", email: "", department: "", departmentId: "", role: "", username: "", password: "",
      });
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      Swal.fire({
        ...swalConfig,
        icon: 'error',
        title: 'Registration Failed',
        text: errorMsg,
      });
    }
  };

  const toggleStatus = async (userId) => {
    if (!canManageStatus) return;
    const result = await Swal.fire({
      ...swalConfig,
      title: 'Update Status?',
      text: "Change this user's activity status?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update it!'
    });

    if (result.isConfirmed) {
      try {
        await axios.put(`http://localhost:5000/api/users/status/${userId}`);
        Swal.fire({ ...swalConfig, icon: 'success', title: 'Updated!', timer: 1000, showConfirmButton: false });
        fetchData();
      } catch (err) {
        Swal.fire({ ...swalConfig, icon: 'error', title: 'Error', text: 'Could not update status' });
      }
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
      Admin: { bg: "#757575", color: "#FFFFFF" }, 
      HOD: { bg: "#000000", color: "#FFFFFF" },
      Employee: { bg: "#757575", color: "#FFFFFF" }, 
    };
    const style = roleStyles[role] || { bg: "#9e9e9e", color: "white" };
    
    const displayRole = (role === "HOD" || role === "SuperAdmin") 
      ? role 
      : (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase());

    return (
      <div style={{
          backgroundColor: style.bg, color: style.color,
          width: "100px", padding: "6px 0", borderRadius: "4px",
          fontWeight: "500", fontSize: "0.75rem", textAlign: "center", display: "inline-block",
          textTransform: "none"
        }}>
        {displayRole}
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

      <Row className="mb-4 g-2 align-items-center">
        <Col md={3}>
          <Form.Control placeholder="Search name..." value={searchTerm} style={dynamicInputStyle} onChange={(e) => setSearchTerm(e.target.value)} />
        </Col>
        
        {myRole !== "hod" && (
          <Col md={3}>
            <Form.Select value={filterDept} style={dynamicInputStyle} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {deptList.map((d) => <option key={d._id} value={d.departmentName}>{d.departmentName}</option>)}
            </Form.Select>
          </Col>
        )}

        <Col md={3}>
          <Form.Select value={filterRole} style={dynamicInputStyle} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {myRole !== "hod" && (
              <>
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Admin">Admin</option>
                <option value="HOD">HOD</option>
              </>
            )}
            <option value="Employee">Employee</option>
          </Form.Select>
        </Col>

        <Col md={1}>
          <Button variant="outline-secondary" className="px-3" onClick={handleReset} title="Reset Filters">
            <RestartAlt />
          </Button>
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
                  <td>
                    <Badge 
                      bg={isDark ? "secondary" : "light"} 
                      text={isDark ? "white" : "dark"}
                      className="border px-3 py-2"
                      style={{ fontWeight: "600", fontSize: "0.85rem", letterSpacing: "0.3px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    >
                      {u.department || "All"}
                    </Badge>
                  </td>
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
                    <div className="d-flex justify-content-center gap-2">
                      <Button variant="outline-primary" size="sm" onClick={() => navigate(`/user-files/${u._id}`)} title="View Files">
                        <Visibility fontSize="small" />
                      </Button>

                      {/* TRIGGER RESET EMAIL BUTTON */}
                      {canManageStatus && (
                        <Button 
                          variant="outline-warning" 
                          size="sm" 
                          onClick={() => handleAdminTriggerReset(u._id, u.username)}
                          title="Authorize Password Reset"
                        >
                          <RestartAlt fontSize="small" />
                        </Button>
                      )}

                      {canManageStatus && (
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleReset2FA(u._id, u.username)}
                          title="Reset 2FA Secret"
                        >
                          <LockReset fontSize="small" />
                        </Button>
                      )}
                    </div>
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
                    {myRole === "superadmin" && <option value="ALL_DEPT">All (Admin/Super Admin)</option>}
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
                  <Form.Control name="username" required style={dynamicInputStyle} placeholder={formData.role ? `Must start with ${rolePrefixes[formData.role]}` : ""} value={formData.username} onChange={handleInputChange} />
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