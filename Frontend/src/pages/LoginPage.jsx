import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; 
import "../styles/login.css"; 
import "@fortawesome/fontawesome-free/css/all.min.css";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("n");
  const [activeRole, setActiveRole] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const [deptList, setDeptList] = useState([]);
  
  // Flag Logic: 0 = visible, 1 = hide
  const [deptVisibilityFlag, setDeptVisibilityFlag] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/departments");
        const data = Array.isArray(response.data) ? response.data : response.data.departments || [];
        setDeptList(data);
      } catch (error) {
        console.error("Error fetching departments for login:", error);
      }
    };
    fetchDepartments();
  }, []);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);

    if (value.startsWith("e-")) {
      setActiveRole("employee");
      setDeptVisibilityFlag(0);
    } else if (value.startsWith("h-")) {
      setActiveRole("hod");
      setDeptVisibilityFlag(0);
    } else if (value.startsWith("a-") || value.startsWith("s-")) {
      // Logic for Admin and SuperAdmin
      setActiveRole(value.startsWith("a-") ? "admin" : "superadmin");
      setDeptVisibilityFlag(1); // Hide Department
      setDepartment("All");     // System assigned
    } else {
      setActiveRole("");
      setDeptVisibilityFlag(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check validation: If flag is 0, department must be selected.
    if (!username || !password || (deptVisibilityFlag === 0 && department === "n")) {
        alert("⚠️ Please fill in all fields!");
        return;
    }

    setIsLoading(true);
    try {
        const response = await axios.post("http://localhost:5000/api/users/login", {
            username: username,
            password: password
        });

        const userData = response.data.user || response.data;
        sessionStorage.setItem("userSession", JSON.stringify(userData)); 

        alert(`Welcome ${userData.name || username}! Redirecting...`);
        onLogin(userData); 
        navigate("/"); 

    } catch (error) {
        console.error("Login Error:", error);
        const message = error.response?.data?.message || "❌ Login failed.";
        alert(message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="role-logo-wrapper">
            {activeRole === "employee" && <i className="fa-solid fa-user-tie employee-logo"></i>}
            {activeRole === "hod" && <i className="fa-solid fa-chalkboard-user hod-logo"></i>}
            {activeRole === "admin" && <i className="fa-solid fa-user-gear admin-logo"></i>}
            {activeRole === "superadmin" && <i className="fa-solid fa-crown superadmin-logo"></i>}
            {!activeRole && <i className="fa-solid fa-user default-logo"></i>}
          </div>
          <h2>Login</h2>
          <p>Enter your credentials to continue</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-wrapper">
              <input 
                type="text" 
                id="username" 
                value={username} 
                onChange={handleUsernameChange} 
                required 
              />
              <label htmlFor="username">Username</label>
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <input 
                type="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <label htmlFor="password">Password</label>
            </div>
          </div>

          {/* FLAG CHECK: Only render if flag is 0 */}
          {deptVisibilityFlag === 0 && (
            <div className="form-group animate-fade-in">
              <div className="input-wrapper select-wrapper">
                <select 
                  id="department" 
                  value={department} 
                  onChange={(e) => setDepartment(e.target.value)} 
                  required 
                >
                  <option value="n">Select Your Department</option>
                  {deptList.map((dept) => (
                    <option key={dept._id} value={dept.departmentName}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
                <label htmlFor="department">Department</label>
              </div>
            </div>
          )}

          <div className="form-options">
            <div className="remember-wrapper">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" className="checkbox-label">
                <span className="checkmark"></span> Remember me
              </label>
            </div>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            <span className="btn-text">{isLoading ? "Verifying..." : "Login"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;