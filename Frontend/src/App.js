import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar"; 		
import FileDashboard from "./pages/FileDashboard"; 	
import UploadFilePage from "./pages/UploadFilePage";
import LoginPage from "./pages/LoginPage";
import CreateUserPage from "./pages/CreateUserPage";

// --- BOOTSTRAP AND GLOBAL STYLES ---
import 'bootstrap/dist/css/bootstrap.min.css';
import "./styles/style.css";
import "./styles/login.css";

import "./styles/UploadFilePage.css";
import "./styles/myfile.css"; // Does this file exist in src/styles/?

// --- IMPORTANT: Verify if this should be 'TransferModal.css' or 'TransferModel.css' ---
import "./styles/TransferModel.css"; 

function App() {
    const [themeMode, setThemeMode] = useState("light");
    
    // Function to switch between light and dark themes
    const toggleTheme = () => setThemeMode(themeMode === "dark" ? "light" : "dark");

    // Global theme class for background and default text color
    const globalThemeClass = themeMode === "dark" ? "bg-dark text-light" : "bg-light text-dark";

    return (
        // Outer wrapper controls the theme and full screen height
        <div className={`min-vh-100 ${globalThemeClass}`}> 
            
            <div className="d-flex">
                {/* Sidebar receives the current theme mode */}
                <Sidebar themeMode={themeMode} />
                
                {/* Main content area */}
                <div 
                    className="flex-grow-1"
                    // Forces Bootstrap's dark mode styles onto nested components
                    data-bs-theme={themeMode} 
                >
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                <FileDashboard 
                                    currentTheme={themeMode} 
                                    onThemeToggle={toggleTheme} 
                                />
                            } 
                        />
                        <Route 
                            path="/upload" 
                            element={
                                <UploadFilePage 
                                    currentTheme={themeMode} 
                                    onThemeToggle={toggleTheme} 
                                />
                            } 
                        />
                        <Route path="/create-user" element={<CreateUserPage />} />
                        <Route path="/login" element={<LoginPage />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

export default App;