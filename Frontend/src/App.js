import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar"; 		
import FileDashboard from "./pages/FileDashboard"; 	
import UploadFilePage from "./pages/UploadFilePage";
// Import other pages (e.g., TransferFilePage)
// import TransferFilePage from "./pages/TransferFilePage";
import LoginPage from "./pages/LoginPage";
import CreateUserPage from "./pages/CreateUserPage";
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    const [themeMode, setThemeMode] = useState("light");
    const toggleTheme = () => setThemeMode(themeMode === "dark" ? "light" : "dark");

    // Global theme class for background and default text color
    const globalThemeClass = themeMode === "dark" ? "bg-dark text-light" : "bg-light text-dark";

    return (
        // Outer wrapper controls the theme and full screen height
        <div className={`min-vh-100 ${globalThemeClass}`}> 
            
            <div className="d-flex">
                <Sidebar themeMode={themeMode} />
                
                {/* The main content area, occupying the rest of the screen */}
                <div 
                    className="flex-grow-1"
                    // CRITICAL FIX: Forces Bootstrap's dark mode styles onto all nested components 
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
                        {/* Add other themed routes here */}
                        {/* <Route 
                            path="/transfer" 
                            element={
                                <TransferFilePage 
                                    currentTheme={themeMode} 
                                    onThemeToggle={toggleTheme} 
                                />
                            } 
                        /> */}
                        <Route path="/create-user" element={<CreateUserPage />} />
                        <Route path="/login" element={<LoginPage />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

export default App;