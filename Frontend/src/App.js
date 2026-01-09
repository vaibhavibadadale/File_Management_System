import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Components
import Sidebar from "./components/Sidebar";        
import Header from "./components/Header"; 
import Footer from "./components/Footer"; 

// Pages
import FileDashboard from "./pages/FileDashboard";  
import UploadFilePage from "./pages/UploadFilePage";
import LoginPage from "./pages/LoginPage";
import VenturesPage from "./pages/VenturesPage"; 
import DepartmentStaff from "./pages/DepartmentStaff"; 
import UsersPage from "./pages/UsersPage"; 
import UserFilesView from "./pages/UserFilesView"; 
import PendingRequestsPage from "./pages/PendingRequestsPage"; 

function App() {
    const [themeMode, setThemeMode] = useState("light");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null); 
    const [isCheckingAuth, setIsCheckingAuth] = useState(true); 
    
    useEffect(() => {
        const savedSession = sessionStorage.getItem("userSession");
        if (savedSession) {
            try {
                const userData = JSON.parse(savedSession);
                setUser(userData);
                setIsAuthenticated(true);
            } catch (err) {
                console.error("Session restoration failed", err);
                sessionStorage.removeItem("userSession");
            }
        }
        setIsCheckingAuth(false);
    }, []);

    const toggleTheme = () => setThemeMode(themeMode === "dark" ? "light" : "dark");

    const handleLoginSuccess = (userData) => {
        sessionStorage.setItem("userSession", JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData); 
    };

    const handleLogout = () => {
        sessionStorage.removeItem("userSession");
        setIsAuthenticated(false);
        setUser(null);
    };

    if (isCheckingAuth) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading Session...</span>
                </div>
            </div>
        );
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
        <div className={`min-vh-100 ${themeMode === "dark" ? "bg-dark text-light" : "bg-light text-dark"}`}> 
            <div className="d-flex align-items-stretch">
                <Sidebar themeMode={themeMode} user={user} />
                
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: "100vh", minWidth: 0 }}>
                    <Header 
                        user={user} 
                        currentTheme={themeMode} 
                        onThemeToggle={toggleTheme} 
                        onLogout={handleLogout} 
                    />

                    <main className="flex-grow-1 p-3 p-md-4">
                        <Routes>
                            <Route path="/" element={<FileDashboard user={user} currentTheme={themeMode} />} />
                            <Route path="/file-manager" element={<UploadFilePage user={user} />} />
                            <Route path="/ventures" element={<VenturesPage user={user} currentTheme={themeMode} />} />
                            
                            <Route path="/users" element={<UsersPage currentTheme={themeMode} user={user} />} />
                            <Route path="/department-staff/:deptId" element={<DepartmentStaff currentTheme={themeMode} user={user} />} />
                            
                            {/* UPDATED: Changed :username to :userId to match database ID navigation */}
                            <Route path="/user-files/:userId" element={<UserFilesView currentTheme={themeMode} user={user} />} />

                            <Route 
                                path="/pending" 
                                element={<PendingRequestsPage user={user} currentTheme={themeMode} />} 
                            />

                            <Route 
                                path="/important" 
                                element={<UploadFilePage user={user} viewMode="important" />} 
                            />
                            
                            <Route path="/trash" element={<div className="p-4"><h3>Trash Bin</h3></div>} />

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