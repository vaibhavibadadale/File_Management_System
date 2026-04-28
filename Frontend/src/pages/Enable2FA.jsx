import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

function Enable2FA({ userId, isAlreadyEnabled, onResetSuccess }) {
  const [qrCode, setQrCode] = useState("");
  const [otp, setOtp] = useState("");
  // Initialize step based on prop
  const [step, setStep] = useState(isAlreadyEnabled ? 3 : 1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentAdmin = JSON.parse(sessionStorage.getItem("userSession"));
  const canReset = ["Admin", "SuperAdmin", "ADMIN", "SUPERADMIN"].includes(currentAdmin?.role);

  // Use useCallback to prevent unnecessary re-renders
  const handleStartSetup = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      // Ensure the URL matches your environment
      const res = await axios.post("http://localhost:5000/api/users/setup-2fa", { userId });
      
      if (res.data.qrCodeUrl) {
        setQrCode(res.data.qrCodeUrl);
        setStep(2);
      } else {
        setError("Backend did not return a QR code URL.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start setup.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // If the user is in step 2 but QR is missing (e.g., state lost), re-trigger setup
  useEffect(() => {
    if (step === 2 && !qrCode) {
      handleStartSetup();
    }
  }, [step, qrCode, handleStartSetup]);

  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("Please enter a 6-digit code.");
    
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/users/confirm-2fa", {
        userId,
        token: otp,
      });
      if (res.data.success) {
        setStep(3);
      }
    } catch (err) {
      setError("Invalid code. Please check your app and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminReset = async () => {
    if (!window.confirm("Are you sure? This will disable 2FA for this user immediately.")) return;
    
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/users/reset-2fa", {
        targetUserId: userId,
        adminId: currentAdmin._id 
      });

      if (res.data.success) {
        alert("2FA Reset Successful.");
        setStep(1);
        setQrCode("");
        setOtp("");
        if (onResetSuccess) onResetSuccess();
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Server Error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="2fa-container" style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9", maxWidth: "400px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>2FA Security</h3>
        {canReset && step === 3 && (
          <button onClick={handleAdminReset} disabled={loading} style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>
            {loading ? "..." : "Reset"}
          </button>
        )}
      </div>

      <hr style={{ margin: "15px 0" }} />

      {/* STEP 1: DISABLED STATE */}
      {step === 1 && (
        <div style={{ textAlign: "center" }}>
          <p>Status: <span style={{ color: "red", fontWeight: "bold" }}>Disabled</span></p>
          <button onClick={handleStartSetup} disabled={loading} style={{ padding: "10px 20px", cursor: "pointer" }}>
            {loading ? "Generating..." : "Enable 2FA Now"}
          </button>
        </div>
      )}

      {/* STEP 2: SCANNING & VERIFICATION */}
      {step === 2 && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "14px" }}>1. Scan QR with Google Authenticator or Authy:</p>
          {qrCode ? (
            <img src={qrCode} alt="2FA QR Code" style={{ margin: "10px 0", width: "180px", height: "180px", border: "1px solid #ddd" }} />
          ) : (
            <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading QR...</div>
          )}
          
          <p style={{ fontSize: "14px" }}>2. Enter the 6-digit code:</p>
          <form onSubmit={handleVerifyAndEnable}>
            <input 
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} 
              maxLength="6"
              placeholder="000000"
              style={{ padding: "10px", fontSize: "20px", textAlign: "center", width: "160px", letterSpacing: "4px", display: "block", margin: "0 auto 15px" }}
            />
            <button type="submit" disabled={loading} style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              {loading ? "Verifying..." : "Verify & Activate"}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ display: "block", width: "100%", marginTop: "10px", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
          </form>
          {error && <p style={{ color: "red", fontSize: "13px", marginTop: "10px" }}>{error}</p>}
        </div>
      )}

      {/* STEP 3: ACTIVE STATE */}
      {step === 3 && (
        <div style={{ textAlign: "center", padding: "10px" }}>
          <div style={{ fontSize: "40px" }}>🛡️</div>
          <p style={{ color: "green", fontWeight: "bold", margin: "5px 0" }}>2FA is Active</p>
          <p style={{ fontSize: "13px", color: "#555" }}>Your account is protected by an additional security layer.</p>
        </div>
      )}
    </div>
  );
}

export default Enable2FA;