import React, { useState } from "react";
import { Form, Button } from "react-bootstrap";
import axios from "axios";

const CreateUserPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/users", {
        name,
        email,
        department,
        role,
        username,
        password,
      });
      alert(`${role} user created successfully!`);
      // Reset form
      setName("");
      setEmail("");
      setDepartment("");
      setRole("");
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error(err);
      alert("Error creating user");
    }
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

        {/* Department */}
        <Form.Group className="mb-3" controlId="department">
          <Form.Label>Department</Form.Label>
          <Form.Select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          >
            <option value="">Select Department</option>
            <option value="NEWS Uncut">NEWS Uncut</option>
            <option value="Swarang">Swarang</option>
            <option value="Praja Jagrut">Praja Jagrut</option>
            <option value="Swaroop Creation">Swaroop Creation</option>
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
