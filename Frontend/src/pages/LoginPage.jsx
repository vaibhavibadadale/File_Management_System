import React, { useState, useEffect, useRef } from "react";
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
  
  const [isOtpStep, setIsOtpStep] = useState(false); 
  const [otpToken, setOtpToken] = useState("");      
  const [tempUserId, setTempUserId] = useState(null); 
  const [showQrModal, setShowQrModal] = useState(false); 
  const [qrCodeData, setQrCodeData] = useState("");      

  const [errorPopup, setErrorPopup] = useState({ show: false, message: "", isSuccess: false });
  const [deptVisibilityFlag, setDeptVisibilityFlag] = useState(0);

  const navigate = useNavigate();
  const API_BASE_URL = "https://likes-fields-dolls-such.trycloudflare.com";
   
  useEffect(() => {
  const fetchDepartments = async () => {
    try {
      // FIX: Ensure this uses the BACKEND tunnel link
      const response = await axios.get(`${API_BASE_URL}/api/departments`); 
      setDeptList(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };
  fetchDepartments();
}, [API_BASE_URL]);
    

  useEffect(() => {
    const sanitized = String(otpToken).replace(/\D/g, "");
    if (sanitized.length === 6) {
      handleAutoVerify(sanitized);
    }
  }, [otpToken]);

  const handleAutoVerify = async (token) => {
    setIsLoading(true);
    try {
        // FIXED: Added backticks for template literal
        const response = await axios.post(`${API_BASE_URL}/api/users/verify-otp`, {
            userId: tempUserId,
            token: token.trim() 
        });

        if (response.data.success || response.data.user) {
            const userData = response.data.user;
            
            if (userData.role !== 'superadmin' && userData.deptDetails && userData.deptDetails.isActive === false) {
                setErrorPopup({ 
                    show: true, 
                    message: `⚠️ Access Denied: The ${userData.department} department has been deactivated.`, 
                    isSuccess: false 
                });
                handleBackToLogin();
                return;
            }

            setErrorPopup({ show: true, message: "✅ Verification Successful!", isSuccess: true });
            
            setTimeout(() => {
                sessionStorage.setItem("userSession", JSON.stringify(userData)); 
                onLogin(userData); 
                navigate("/"); 
            }, 1200);
        }
    } catch (error) {
        setOtpToken(""); 
        const serverMsg = error.response?.data?.message || "Invalid OTP Code!";
        setErrorPopup({ show: true, message: `⚠️ ${serverMsg}`, isSuccess: false });
    } finally {
        setIsLoading(false);
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);

    const lowerVal = value.toLowerCase();
    if (lowerVal.startsWith("e-")) {
      setActiveRole("employee");
      setDeptVisibilityFlag(0);
    } else if (lowerVal.startsWith("h-")) {
      setActiveRole("hod");
      setDeptVisibilityFlag(0);
    } else if (lowerVal.startsWith("a-")) {
      setActiveRole("admin");
      setDeptVisibilityFlag(1);
      setDepartment("All");
    } else if (lowerVal.startsWith("s-")) {
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

    if (deptVisibilityFlag === 0 && department === "n") {
        setErrorPopup({ 
            show: true, 
            message: "⚠️ Please choose your assigned department.",
            isSuccess: false
        });
        return;
    }

    setIsLoading(true);
    try {
        // FIXED: Added backticks for template literal
        const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
            username: username.trim().toLowerCase(),
            password: password,
            department: department.trim() 
        });

        if (response.data.departmentActive === false && activeRole !== 'superadmin') {
            setErrorPopup({ 
                show: true, 
                message: `⚠️ The ${department} department is currently deactivated. Please contact the Super Admin.`, 
                isSuccess: false 
            });
            setIsLoading(false);
            return;
        }

        if (response.data.requires2FA) {
            setTempUserId(response.data.userId);
            setIsOtpStep(true); 

            if (response.data.mustSetup) {
                handleShowSetup(response.data.userId);
            }
        } else {
            const userData = response.data.user || response.data;
            sessionStorage.setItem("userSession", JSON.stringify(userData)); 
            onLogin(userData); 
            navigate("/"); 
        }
    } catch (error) {
        const serverMsg = error.response?.data?.message || "❌ Invalid Credentials!";
        setErrorPopup({ show: true, message: serverMsg, isSuccess: false });
    } finally {
        setIsLoading(false);
    }
  };

  const handleShowSetup = async (idFromLogin = null) => {
    const targetId = idFromLogin || tempUserId;
    if (!targetId) return;

    try {
      // FIXED: Switched localhost to API_BASE_URL with backticks
      const response = await axios.post(`${API_BASE_URL}/api/users/setup-2fa`, {
        userId: targetId
      });
      setQrCodeData(response.data.qrImageUrl);
      setShowQrModal(true);
    } catch (error) {
      setErrorPopup({ 
        show: true, 
        message: "Could not load QR code. Ensure your server is running.", 
        isSuccess: false 
      });
    }
  };

  const handleBackToLogin = () => {
    setIsOtpStep(false);
    setOtpToken("");
    setTempUserId(null);
    setQrCodeData("");
    setShowQrModal(false); 
    setErrorPopup({ show: false, message: "", isSuccess: false });
  };

  return (
    <div className="login-container">
      {errorPopup.show && (
        <div className="modal-overlay" onClick={() => !errorPopup.isSuccess && setErrorPopup({ ...errorPopup, show: false })}>
          <div className="fancy-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon" style={{ 
                color: errorPopup.isSuccess ? '#28a745' : '#ff4757',
                background: errorPopup.isSuccess ? '#e8f5e9' : '#fff5f5',
                borderColor: errorPopup.isSuccess ? '#c8e6c9' : '#ffebeb'
            }}>
                <i className={`fa-solid ${errorPopup.isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
            </div>
            <h3>{errorPopup.isSuccess ? 'Success' : 'Access Restricted'}</h3>
            <p>{errorPopup.message}</p>
            {!errorPopup.isSuccess && (
                <button className="close-popup-btn" onClick={() => setErrorPopup({ ...errorPopup, show: false })}>Try Again</button>
            )}
          </div>
        </div>
      )}

      <div className="login-card">
        <div className="login-header">
          <div className="role-logo-wrapper">
            {isOtpStep ? (
               <i className="fa-solid fa-shield-halved" style={{color: '#3b82f6'}}></i>
            ) : (
              <>
                {activeRole === "employee" && <i className="fa-solid fa-user-tie employee-logo"></i>}
                {activeRole === "hod" && <i className="fa-solid fa-chalkboard-user hod-logo"></i>}
                {activeRole === "admin" && <i className="fa-solid fa-user-gear admin-logo"></i>}
                {activeRole === "superadmin" && <i className="fa-solid fa-crown superadmin-logo"></i>}
                {!activeRole && <i className="fa-solid fa-user default-logo"></i>}
              </>
            )}
          </div>
          <h2>{isOtpStep ? "Verification" : "Login"}</h2>
          <p>
            {showQrModal 
              ? "Scan the QR code, then enter the code below" 
              : isOtpStep 
                ? "Enter the 6-digit code from your app" 
                : "Enter your credentials to continue"}
          </p>
        </div>

        {!isOtpStep ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-wrapper">
                <input type="text" id="username" value={username} onChange={handleUsernameChange} autoComplete="username" required />
                <label htmlFor="username">Username</label>
              </div>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <label htmlFor="password">Password</label>
              </div>
            </div>

            {deptVisibilityFlag === 0 && (
              <div className="form-group animate-fade-in">
                <div className="input-wrapper select-wrapper">
                  <select id="department" value={department} onChange={(e) => setDepartment(e.target.value)} required >
                    <option value="n">Select Your Department</option>
                    {deptList.map((dept) => (
                      <option key={dept._id} value={dept.departmentName}>{dept.departmentName}</option>
                    ))}
                  </select>
                  <label htmlFor="department">Department</label>
                </div>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? "Checking..." : "Login"}
            </button>
          </form>
        ) : (
          <div className="login-form">
            {showQrModal && qrCodeData && (
              <div className="qr-setup-area text-center mb-4">
                <div className="qr-image-wrapper p-2 bg-white d-inline-block rounded shadow-sm">
                  <img src={qrCodeData} alt="Scan Me" style={{ width: '160px' }} />
                </div>
                <p className="small text-muted mt-2">Open Authenticator App to Scan</p>
              </div>
            )}

            <div className="form-group">
              <div className="input-wrapper">
                <input 
                  type="text" 
                  id="otp"
                  value={otpToken} 
                  onChange={(e) => setOtpToken(e.target.value)} 
                  placeholder="· · · · · ·"
                  maxLength="6"
                  style={{ textAlign: 'center', fontSize: '28px', letterSpacing: '8px', fontWeight: 'bold' }}
                  required 
                  autoFocus
                />
                <label htmlFor="otp">6-Digit Code</label>
              </div>
            </div>

            <button className="login-btn" disabled={isLoading || otpToken.length < 6}>
              {isLoading ? "Verifying..." : "Verifying Code..."}
            </button>
            
            <button type="button" className="forgot-password" style={{border:'none', background:'none', width:'100%', marginTop:'15px', cursor:'pointer', color: '#64748b'}} onClick={handleBackToLogin}>
                <i className="fa-solid fa-arrow-left" style={{marginRight: '5px'}}></i> Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;