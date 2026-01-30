import React from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessIcon from "@mui/icons-material/Business"; 
import FolderCopyIcon from "@mui/icons-material/FolderCopy"; 
import PendingActionsIcon from "@mui/icons-material/PendingActions"; 
import StarIcon from "@mui/icons-material/Star"; 
import PersonAddIcon from "@mui/icons-material/PersonAdd"; 
import DeleteIcon from "@mui/icons-material/Delete"; 
import StorageIcon from "@mui/icons-material/Storage"; // ADDED: Icon for Backup
import "../styles/sidebar.css";

const sidebarItems = [
  { 
    text: "Dashboard", 
    icon: <DashboardIcon />, 
    path: "/", 
    roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    text: "Ventures", 
    icon: <BusinessIcon />, 
    path: "/ventures", 
    roles: ["HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    text: "File Manager", 
    icon: <FolderCopyIcon />, 
    path: "/file-manager", 
    roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    text: "Pending Request", 
    icon: <PendingActionsIcon />, 
    path: "/pending", 
    roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    text: "Important Files", 
    icon: <StarIcon />, 
    path: "/important", 
    roles: ["EMPLOYEE", "HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    text: "Users", 
    icon: <PersonAddIcon />, 
    path: "/users", 
    roles: ["HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    text: "Trash", 
    icon: <DeleteIcon />, 
    path: "/trash", 
    roles: ["HOD", "ADMIN", "SUPERADMIN"] 
  },
  { 
    // ADDED: Backup Menu Item
    text: "Backup System", 
    icon: <StorageIcon />, 
    path: "/backup", 
    roles: ["ADMIN", "SUPERADMIN"] 
  },
];

function Sidebar({ themeMode, user }) { 
  const location = useLocation();
  const isDark = themeMode === "dark";
  
  const userRole = user?.role 
    ? user.role.toUpperCase().replace(/\s+/g, '').trim() 
    : "EMPLOYEE";

  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  return (
    <nav className={`sidebar-container ${isDark ? "dark-theme" : "light-theme"}`}>
      <div className="sidebar-header">
        <h5 className="sidebar-logo-text">
            FILE DASHBOARD
        </h5>
      </div>

      <ul className="sidebar-list">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.text} className="nav-item">
              <Link 
                to={item.path} 
                className={`nav-link-custom ${isActive ? "active" : ""}`}
              >
                <span className="icon-wrapper">{item.icon}</span>
                <span className="link-text">
                  {item.text}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;