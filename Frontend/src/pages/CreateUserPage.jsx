import React, { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
import axios from "axios";

const CreateUserPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(""); // Stores Name for display
  const [departmentId, setDepartmentId] = useState(""); // Stores MongoDB ID for link
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // --- NEW: State for dynamic departments ---
  const [deptList, setDeptList] = useState([]);

  // --- NEW: Fetch departments from Backend on load ---
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/departments");
        setDeptList(res.data);
      } catch (err) {
        console.error("Error fetching departments for dropdown:", err);
      }
    };
    fetchDepts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/users", {
        name,
        email,
        department,   // The string name
        departmentId, // The MongoDB ObjectId (Crucial for the staff list page)
        role,
        username,
        password,
        employeeId: `EMP-${Date.now()}`, 
      });

      alert(`${role} user created successfully! Folder created for ${username}.`);
      
      // Reset form
      setName("");
      setEmail("");
      setDepartment("");
      setDepartmentId("");
      setRole("");
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error(err);
      alert("Error creating user: " + (err.response?.data?.error || err.message));
    }
  };

  // Helper to handle department selection
  const handleDeptChange = (e) => {
    const selectedId = e.target.value;
    const selectedDept = deptList.find(d => d._id === selectedId);
    
    setDepartmentId(selectedId);
    setDepartment(selectedDept ? selectedDept.departmentName : "");
  };

  return (
    <div className="p-4" style={{ minHeight: "100vh" }}>
      <h4 className="mb-3">Create User</h4>
      <Form onSubmit={handleSubmit}>
        {/* Name */}
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Form.Group>

        {/* Office Email */}
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Office Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        {/* Dynamic Department Selection */}
        <Form.Group className="mb-3" controlId="department">
          <Form.Label>Department</Form.Label>
          <Form.Select
            value={departmentId}
            onChange={handleDeptChange}
            required
          >
            <option value="">Select Department</option>
            {deptList.map((d) => (
              <option key={d._id} value={d._id}>
                {d.departmentName}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* Role */}
        <Form.Group className="mb-3" controlId="role">
          <Form.Label>Role</Form.Label>
          <Form.Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Select Role</option>
            <option value="Employee">Employee</option>
            <option value="HOD">HOD</option>
            <option value="Admin">Admin</option>
            <option value="SuperAdmin">SuperAdmin</option>
          </Form.Select>
        </Form.Group>

        {/* Username */}
        <Form.Group className="mb-3" controlId="username">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Form.Group>

        {/* Password */}
        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Button type="submit">Create User</Button>
      </Form>
    </div>
  );
};

export default CreateUserPage;