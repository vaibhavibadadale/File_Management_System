import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const Header = ({ user, currentTheme, onThemeToggle, onLogout }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        /* Added 'sticky-top' and 'z-3' (Bootstrap z-index 1000+) to keep it at the top */
        <header 
            className={`p-3 border-bottom d-flex justify-content-between align-items-center sticky-top z-3 ${
                currentTheme === "dark" ? "bg-dark border-secondary text-light" : "bg-white text-dark shadow-sm"
            }`}
            style={{ top: 0 }} 
        >
            <h5 className="m-0 fw-bold px-2">Aaryans File Management System</h5>

            <div className="d-flex align-items-center gap-3">
                {/* Round Theme Toggle */}
                <button 
                    className={`btn d-flex align-items-center justify-content-center rounded-circle p-0 ${currentTheme === "dark" ? "btn-outline-warning" : "btn-outline-dark"}`} 
                    onClick={onThemeToggle}
                    style={{ width: "35px", height: "35px", border: '1px solid' }}
                >
                    {currentTheme === "dark" ? "☀️" : "🌙"}
                </button>

                {/* Profile Section */}
                <div className="position-relative" ref={dropdownRef}>
                    <div 
                        className="d-flex align-items-center gap-3 ps-3 border-start border-secondary" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div className="text-end d-none d-sm-block">
                            <p className="m-0 small fw-bold" style={{ lineHeight: '1.2' }}>{user?.username || "Guest"}</p>
                            <p className="m-0 text-primary" style={{ fontSize: '0.75rem' }}>
                                {user?.role || "No Role Assigned"}
                            </p>
                        </div>

                        {/* Profile Icon with Online Dot */}
                        <div className="position-relative">
                            <div className={`rounded-circle d-flex align-items-center justify-content-center border ${currentTheme === 'dark' ? 'border-secondary' : 'border-light-subtle'}`}
                                style={{ width: "42px", height: "42px", backgroundColor: currentTheme === 'dark' ? '#2d3748' : '#f8f9fa' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                </svg>
                            </div>
                            <span className="position-absolute bottom-0 end-0 border border-white rounded-circle bg-success" 
                                style={{ width: "12px", height: "12px", border: '2px solid white' }}></span>
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className={`position-absolute end-0 mt-2 shadow-lg rounded-3 py-2 ${currentTheme === 'dark' ? 'bg-dark border border-secondary text-light' : 'bg-white border text-dark'}`}
                             style={{ width: "200px", zIndex: 1050 }}>
                            <div className="px-3 py-2 border-bottom border-secondary mb-1">
                                <span className="small text-muted d-block">Signed in as</span>
                                <strong className="small">{user?.username}</strong>
                            </div>
                            <Link to="/profile" className="dropdown-item px-3 py-2 small d-block text-decoration-none text-reset">👤 My Profile</Link>
                            <hr className="my-1 border-secondary" />
                            <button 
                                onClick={onLogout} 
                                className="dropdown-item px-3 py-2 small w-100 text-start border-0 bg-transparent text-danger fw-bold"
                            >
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;