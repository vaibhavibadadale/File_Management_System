import React, { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";         
import FileDashboard from "./pages/FileDashboard";  
import UploadFilePage from "./pages/UploadFilePage";
import LoginPage from "./pages/LoginPage";
import CreateUserPage from "./pages/CreateUserPage";


function App() {
  const [themeMode, setThemeMode] = useState("light");
  const toggleTheme = () => setThemeMode(themeMode === "dark" ? "light" : "dark");

  return (
    <div className="d-flex">
      <Sidebar themeMode={themeMode} />
      <div className="flex-grow-1">
        <Routes>
          <Route path="/" element={<FileDashboard themeMode={themeMode} toggleTheme={toggleTheme} />} />
          <Route path="/upload" element={<UploadFilePage themeMode={themeMode} toggleTheme={toggleTheme} />} />
          <Route path="/create-user" element={<CreateUserPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </div>
  );
}

// ✅ Add this line to fix the import error in index.js
export default App;
