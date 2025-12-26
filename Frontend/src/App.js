import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";        
import Header from "./components/Header"; // Global Header
import Footer from "./components/Footer"; // Global Footer
import FileDashboard from "./pages/FileDashboard";  
import UploadFilePage from "./pages/UploadFilePage";
import LoginPage from "./pages/LoginPage";
import CreateUserPage from "./pages/CreateUserPage";
import VenturesPage from "./pages/VenturesPage"; 
// 1. IMPORT the new DepartmentStaff page
import DepartmentStaff from "./pages/DepartmentStaff"; 

// --- BOOTSTRAP AND GLOBAL STYLES ---
import 'bootstrap/dist/css/bootstrap.min.css';
import "./styles/style.css";
import "./styles/login.css";
import "./styles/UploadFilePage.css";
import "./styles/myfile.css"; 
import "./styles/TransferModel.css"; 

function App() {
    const [themeMode, setThemeMode] = useState("light");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null); 
    const [isCheckingAuth, setIsCheckingAuth] = useState(true); 
    
    useEffect(() => {
        const savedSession = sessionStorage.getItem("userSession");
        if (savedSession) {
            const userData = JSON.parse(savedSession);
            setUser(userData);
            setIsAuthenticated(true);
        }
        setIsCheckingAuth(false);
    }, []);

    const toggleTheme = () => setThemeMode(themeMode === "dark" ? "light" : "dark");

    const handleLoginSuccess = (userData) => {
        console.log("Login Success. User Data received:", userData);
        sessionStorage.setItem("userSession", JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData); 
    };

    const handleLogout = () => {
        sessionStorage.removeItem("userSession");
        setIsAuthenticated(false);
        setUser(null);
    };

    const globalThemeClass = themeMode === "dark" ? "bg-dark text-light" : "bg-light text-dark";

    if (isCheckingAuth) {
        return <div className="d-flex justify-content-center align-items-center vh-100">Loading Session...</div>;
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage onLogin={handleLoginSuccess} />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    return (
        <div className={`min-vh-100 ${globalThemeClass}`}> 
            <div className="d-flex">
                <Sidebar themeMode={themeMode} user={user} />
                
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: "100vh" }} data-bs-theme={themeMode}>
                    
                    <Header 
                        user={user} 
                        currentTheme={themeMode} 
                        onThemeToggle={toggleTheme} 
                        onLogout={handleLogout} 
                    />

                    <main className="flex-grow-1 p-4">
                        <Routes>
                            <Route path="/" element={<FileDashboard user={user} />} />
                            <Route path="/upload" element={<UploadFilePage user={user} />} />
                            <Route path="/ventures" element={<VenturesPage user={user} />} />
                            
                            {/* 2. ADD the dynamic route for Department Staff */}
                            {/* The path MUST match what you used in VenturesPage: /department-staff/:deptId */}
                            <Route path="/department-staff/:deptId" element={<DepartmentStaff />} />
                            
                            <Route path="/create-user" element={<CreateUserPage />} />
                            <Route path="/login" element={<Navigate to="/" />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>

                    <Footer currentTheme={themeMode} />
                </div>
            </div>
        </div>
    );
}

export default App;