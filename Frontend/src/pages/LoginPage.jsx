import React, { useState } from "react";
import "../styles/login.css"; // ✅ Make sure the CSS path is correct
import "@fortawesome/fontawesome-free/css/all.min.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("n");
  const [activeRole, setActiveRole] = useState("");

  // ✅ Detect role prefix dynamically
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);

    if (value.startsWith("e-")) setActiveRole("employee");
    else if (value.startsWith("h-")) setActiveRole("hod");
    else if (value.startsWith("a-")) setActiveRole("admin");
    else if (value.startsWith("s-")) setActiveRole("superadmin");
    else setActiveRole("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username || !password || department === "n") {
      alert("⚠️ Please fill in all fields!");
      return;
    }

    alert(`Welcome ${username}! Redirecting to dashboard...`);
    window.location.href = "/";
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* HEADER */}
        <div className="login-header">
          {/* ✅ Dynamic logo above Login */}
          <div className="role-logo-wrapper">
            {activeRole === "employee" && (
              <i className="fa-solid fa-user-tie employee-logo"></i>
            )}
            {activeRole === "hod" && (
              <i className="fa-solid fa-chalkboard-user hod-logo"></i>
            )}
            {activeRole === "admin" && (
              <i className="fa-solid fa-user-gear admin-logo"></i>
            )}
            {activeRole === "superadmin" && (
              <i className="fa-solid fa-crown superadmin-logo"></i>
            )}
            {!activeRole && <i className="fa-solid fa-user default-logo"></i>}
          </div>

          <h2>Login</h2>
          <p>Enter your credentials to continue</p>
        </div>

        {/* FORM */}
        <form className="login-form" onSubmit={handleSubmit}>
          {/* USERNAME */}
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

          {/* PASSWORD */}
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

          {/* DEPARTMENT */}
          <div className="form-group">
            <div className="input-wrapper select-wrapper">
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              >
                <option value="n">Select Your Department</option>
                <option value="swaroop">Swaroop Creation</option>
                <option value="swarang">Swarang</option>
                <option value="news">News Uncut</option>
                <option value="praja">Praja Jagruti</option>
              </select>
              <label htmlFor="department">Department</label>
            </div>
          </div>

          {/* OPTIONS */}
          <div className="form-options">
            <div className="remember-wrapper">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" className="checkbox-label">
                <span className="checkmark"></span> Remember me
              </label>
            </div>
            <a href="#" className="forgot-password">
              Forgot Password?
            </a>
          </div>

          {/* SUBMIT */}
          <button type="submit" className="login-btn">
            <span className="btn-text">Login</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
