import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Offcanvas, Button } from "react-bootstrap";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SendIcon from "@mui/icons-material/Send";
import StarIcon from "@mui/icons-material/Star";
import SettingsApplicationsIcon from "@mui/icons-material/SettingsApplications";
import BusinessIcon from "@mui/icons-material/Business"; 
import PeopleIcon from "@mui/icons-material/People"; // Icon for Users management

// Updated sidebarItems: Removed 'Create User' and added 'Users'
const sidebarItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Ventures", icon: <BusinessIcon />, path: "/ventures" },
  { text: "Users", icon: <PeopleIcon />, path: "/users" }, // Changed from Create User
  { text: "Upload File", icon: <UploadFileIcon />, path: "/upload" },
  { text: "Transfer File", icon: <SendIcon />, path: "" },
  { text: "Edit/Delete Request", icon: <SettingsApplicationsIcon />, path: "" },
  { text: "Important Files", icon: <StarIcon />, path: "" },
  { text: "Pending Requests", icon: <StarIcon />, path: "" },
];

function Sidebar({ themeMode }) {
  const location = useLocation();
  const [show, setShow] = useState(false);

  const isDark = themeMode === "dark";
  const bgColor = isDark ? "#1E1E1E" : "#FFFFFF";
  const textColor = isDark ? "#E0E0E0" : "#212529";
  const borderColor = isDark ? "#333" : "#dee2e6";
  const activeBg = "#0d6efd";
  const activeText = "#fff";

  const renderLinks = (onClickClose = () => {}) =>
    sidebarItems.map((item) => {
      const isActive = location.pathname === item.path;
      return (
        <li key={item.text} className="nav-item mb-2">
          <Link
            to={item.path}
            className={`nav-link ${isActive ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              color: isActive ? activeText : textColor,
              backgroundColor: isActive ? activeBg : "transparent",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              textDecoration: "none",
              transition: "background 0.2s, color 0.2s",
            }}
            onClick={onClickClose}
          >
            {item.icon}
            <span className="ms-2">{item.text}</span>
          </Link>
        </li>
      );
    });

  return (
    <>
      <Button
        variant={isDark ? "outline-light" : "outline-dark"}
        className="d-lg-none m-2"
        onClick={() => setShow(true)}
      >
        ☰ Menu
      </Button>

      <nav
        className="d-none d-lg-flex flex-column p-3 flex-shrink-0"
        style={{
          width: "240px",
          height: "100vh",
          backgroundColor: bgColor,
          color: textColor,
          borderRight: `1px solid ${borderColor}`,
          transition: "background 0.3s, color 0.3s",
        }}
      >
        <h5 className="text-center py-2 border-bottom mb-3" style={{ borderColor, color: textColor }}>
          File Dashboard
        </h5>
        <ul className="nav nav-pills flex-column mb-auto">{renderLinks()}</ul>
      </nav>

      <Offcanvas show={show} onHide={() => setShow(false)} style={{ backgroundColor: bgColor, color: textColor }}>
        <Offcanvas.Header closeButton closeVariant={isDark ? "white" : ""}>
          <Offcanvas.Title>File Dashboard</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ul className="nav nav-pills flex-column mb-auto">
            {renderLinks(() => setShow(false))}
          </ul>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Sidebar;