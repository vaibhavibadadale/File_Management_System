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
  
  // --- Fancy Popup State ---
  const [errorPopup, setErrorPopup] = useState({ show: false, message: "" });

  // Flag Logic: 0 = visible (Employee/HOD), 1 = hide (Admin/SuperAdmin)
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
    } else if (value.startsWith("a-")) {
      setActiveRole("admin");
      setDeptVisibilityFlag(1);
      setDepartment("All");
    } else if (value.startsWith("s-")) {
      setActiveRole("superadmin");
      setDeptVisibilityFlag(1);
      setDepartment("All");
    } else {
      setActiveRole("");
      setDeptVisibilityFlag(0);
      if (department === "All") setDepartment("n");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Front-end Validation for Department
    if (deptVisibilityFlag === 0 && department === "n") {
        setErrorPopup({ 
            show: true, 
            message: "⚠️ Invalid Department Name! Please choose your assigned department." 
        });
        return;
    }

    setIsLoading(true);
    try {
        const response = await axios.post("http://localhost:5000/api/users/login", {
            username: username.trim(),
            password: password,
            department: department 
        });

        const userData = response.data.user || response.data;
        sessionStorage.setItem("userSession", JSON.stringify(userData)); 

        onLogin(userData); 
        navigate("/"); 

    } catch (error) {
        console.error("Login Error:", error);
        const serverMsg = error.response?.data?.error || error.response?.data?.message || "";
        
        // Specific Fancy Popup for Department Mismatch
        if (serverMsg.toLowerCase().includes("department")) {
            setErrorPopup({ 
                show: true, 
                message: "⚠️ Invalid Department Name! Please choose your assigned department." 
            });
        } else {
            setErrorPopup({ 
                show: true, 
                message: "❌ Invalid Credentials! Please check your username and password." 
            });
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      
      {/* --- FANCY POPUP MODAL --- */}
      {errorPopup.show && (
        <div className="modal-overlay" onClick={() => setErrorPopup({ show: false, message: "" })}>
          <div className="fancy-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h3>Authentication Error</h3>
            <p>{errorPopup.message}</p>
            <button className="close-popup-btn" onClick={() => setErrorPopup({ show: false, message: "" })}>
              Try Again
            </button>
          </div>
        </div>
      )}

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
                autoComplete="username"
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
                autoComplete="current-password"
                required 
              />
              <label htmlFor="password">Password</label>
            </div>
          </div>

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