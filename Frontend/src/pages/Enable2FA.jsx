import React, { useState, useEffect } from "react";
import axios from "axios";

function Enable2FA({ userId, userRole, isAlreadyEnabled, onResetSuccess }) {
  const [qrCode, setQrCode] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(isAlreadyEnabled ? 3 : 1); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get current logged-in admin info from your storage
  const currentAdmin = JSON.parse(sessionStorage.getItem("userSession"));
  const canReset = ["Admin", "SuperAdmin", "ADMIN", "SUPERADMIN"].includes(currentAdmin?.role);

  // Step 1: Get the QR Code from Backend
  const handleStartSetup = async () => {
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/users/setup-2fa", { userId });
      setQrCode(res.data.qrCodeUrl);
      setStep(2);
    } catch (err) {
      setError("Failed to start setup.");
    }
  };

  // Step 2: Verify the first code to "Lock" 2FA
  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/users/confirm-2fa", {
        userId,
        token: otp,
      });
      if (res.data.success) {
        setStep(3);
      }
    } catch (err) {
      setError("Invalid code. Please try again.");
    }
  };

  // --- NEW: ADMIN RESET LOGIC ---
  const handleAdminReset = async () => {
    if (!window.confirm("Are you sure? This will disable 2FA for this user immediately.")) return;
    
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/users/reset-2fa", {
        targetUserId: userId,
        adminId: currentAdmin._id // Pass requester ID for backend check
      });

      if (res.data.success) {
        alert("2FA Reset Successful.");
        setStep(1); // Move back to setup step
        setQrCode("");
        setOtp("");
        if (onResetSuccess) onResetSuccess(); // Optional callback to refresh parent list
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Server Error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="2fa-container" style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Two-Factor Authentication (2FA)</h3>
        
        {/* Only show Reset button to Admins/SuperAdmins if 2FA is active */}
        {canReset && step === 3 && (
          <button 
            onClick={handleAdminReset} 
            disabled={loading}
            style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}
          >
            {loading ? "Resetting..." : "Admin: Reset 2FA"}
          </button>
        )}
      </div>

      <hr />

      {step === 1 && (
        <div style={{ textAlign: "center" }}>
          <p>Status: <span style={{ color: "red" }}>Disabled</span></p>
          <button onClick={handleStartSetup} className="login-btn">Enable 2FA Now</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: "center" }}>
          <p>1. Scan this QR code with Google Authenticator:</p>
          <img src={qrCode} alt="QR Code" style={{ margin: "20px 0", border: "5px solid white" }} />
          
          <p>2. Enter the 6-digit code from your app:</p>
          <form onSubmit={handleVerifyAndEnable}>
            <input 
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              maxLength="6"
              placeholder="000000"
              style={{ padding: "10px", fontSize: "18px", textAlign: "center", width: "150px", letterSpacing: "5px" }}
            />
            <br /><br />
            <button type="submit" className="login-btn">Confirm & Activate</button>
            <button type="button" onClick={() => setStep(1)} style={{ marginLeft: "10px", background: "none", border: "none", color: "blue", cursor: "pointer" }}>Cancel</button>
          </form>
          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </div>
      )}

      {step === 3 && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "40px" }}>✅</div>
          <p style={{ color: "green", fontWeight: "bold" }}>2FA is Active</p>
          <p>Your account is secured. You will need your authenticator app to log in.</p>
        </div>
      )}
    </div>
  );
}

export default Enable2FA;