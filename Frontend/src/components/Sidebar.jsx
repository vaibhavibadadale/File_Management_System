import React from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessIcon from "@mui/icons-material/Business"; 
import FolderCopyIcon from "@mui/icons-material/FolderCopy"; 
import PendingActionsIcon from "@mui/icons-material/PendingActions"; 
import StarIcon from "@mui/icons-material/Star"; 
import PersonAddIcon from "@mui/icons-material/PersonAdd"; 
import DeleteIcon from "@mui/icons-material/Delete"; 
import "../styles/sidebar.css";

const sidebarItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/", roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPER_ADMIN"] },
  { text: "Ventures", icon: <BusinessIcon />, path: "/ventures", roles: ["HOD", "ADMIN", "SUPER_ADMIN"] },
  { text: "File Manager", icon: <FolderCopyIcon />, path: "/file-manager", roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPER_ADMIN"] },
  { text: "Pending Request", icon: <PendingActionsIcon />, path: "/pending", roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPER_ADMIN"] },
  { text: "Important Files", icon: <StarIcon />, path: "/important", roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPER_ADMIN"] },
  { text: "Create User", icon: <PersonAddIcon />, path: "/users", roles: ["HOD", "ADMIN", "SUPER_ADMIN"] },
  { text: "Trash", icon: <DeleteIcon />, path: "/trash", roles: ["HOD", "ADMIN", "SUPER_ADMIN"] },
];

function Sidebar({ themeMode, user }) { 
  const location = useLocation();
  const isDark = themeMode === "dark";
  const userRole = user?.role?.toUpperCase() || "EMPLOYEE";

  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <nav className={`sidebar-container ${isDark ? "dark-theme" : "light-theme"}`}>
      <div className="sidebar-header">
        {/* CSS will hide this automatically on mobile */}
        <h5 className="sidebar-logo-text">File Dashboard</h5>
      </div>

      <ul className="nav nav-pills flex-column mb-auto sidebar-list p-0">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.text} className="nav-item">
              <Link to={item.path} className={`nav-link-custom ${isActive ? "active" : ""}`}>
                <span className="icon-wrapper">{item.icon}</span>
                {/* CSS will hide this automatically on mobile */}
                <span className="link-text">{item.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;