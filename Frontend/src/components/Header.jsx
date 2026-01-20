import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Header = ({ user, currentTheme, onThemeToggle, onLogout }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotifyOpen, setIsNotifyOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    
    const dropdownRef = useRef(null);
    const notifyRef = useRef(null);
    const navigate = useNavigate();

   const fetchNotifications = async () => {
    try {
        if (!user || !user._id) return;

        const res = await axios.get(`http://localhost:5000/api/notifications`, {
            params: { 
                role: user.role,
                userId: user._id,
                // Ensures if department is missing, it sends an empty string instead of undefined
                department: user.department || "" 
            }
        });

        const unreadOnly = res.data.filter(n => !n.isRead);
        setNotifications(unreadOnly);
    } catch (err) {
        console.error("Error fetching notifications:", err);
    }
};

    const handleNotificationClick = async (notification) => {
    try {
        // 1. Mark as read in the backend
        await axios.put(`http://localhost:5000/api/notifications/mark-read/${notification._id}`); 
        
        // 2. Remove from the local dropdown list
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        setIsNotifyOpen(false);

        // 3. Normalize strings (Convert to lowercase and remove hidden spaces)
        const title = (notification.title || "").toLowerCase().trim();
        const msg = (notification.message || "").toLowerCase().trim();

        console.log("Processing Redirection for:", title); // This helps you debug in F12

        // 4. Redirection Logic
        if (title.includes('user')) {
            navigate('/users');
        } 
        // This will now catch "New TRANSFER Request", "TRANSFER", etc.
        else if (
            title.includes('transfer') || 
            title.includes('request') || 
            title.includes('delete') || 
            msg.includes('requested') ||
            msg.includes('transfer')
        ) {
            console.log("Match found! Redirecting to /pending");
            navigate('/pending'); 
        } 
        else {
            // If no keywords match, it goes here
            console.log("No keyword match. Defaulting to history.");
            navigate('/notifications');
        }
    } catch (err) {
        console.error("Notification action error:", err);
        navigate('/notifications');
    }
};
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); 
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (notifyRef.current && !notifyRef.current.contains(event.target)) {
                setIsNotifyOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // SHARED STYLE: Now 40px to match User Circle
    const iconButtonStyle = {
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        border: "1px solid",
        borderColor: currentTheme === 'dark' ? '#495057' : '#dee2e6',
    };

    return (
        <header className={`p-3 border-bottom d-flex justify-content-between align-items-center sticky-top z-3 ${
            currentTheme === "dark" ? "bg-dark border-secondary text-light" : "bg-white text-dark shadow-sm"
        }`}>
            <h5 className="m-0 fw-bold px-2 text-truncate">Aaryans File Management System</h5>

            <div className="d-flex align-items-center gap-3">
                {/* Theme Toggle Button (40px) */}
                <button 
                    className={`btn rounded-circle shadow-none ${currentTheme === "dark" ? "btn-outline-warning" : "btn-outline-dark"}`} 
                    onClick={onThemeToggle}
                    style={iconButtonStyle}
                >
                    <span style={{ fontSize: "20px" }}>{currentTheme === "dark" ? "☀️" : "🌙"}</span>
                </button>

                {/* Notification Bell Button (40px) */}
                <div className="position-relative" ref={notifyRef}>
                    <button 
                        className={`btn rounded-circle shadow-none ${currentTheme === "dark" ? "btn-outline-light" : "btn-outline-dark"}`}
                        style={iconButtonStyle}
                        onClick={() => {
                            setIsNotifyOpen(!isNotifyOpen);
                            setIsDropdownOpen(false);
                        }}
                    >
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
                        </svg>
                        {notifications.length > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-2 border-white" 
                                  style={{ fontSize: '0.65rem', padding: '0.3em 0.5em', marginTop: '2px', marginLeft: '-2px' }}>
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {isNotifyOpen && (
                        <div className={`position-absolute end-0 mt-2 shadow-lg rounded-3 overflow-hidden ${currentTheme === 'dark' ? 'bg-dark border border-secondary' : 'bg-white border'}`} 
                             style={{ width: "350px", zIndex: 1060 }}>
                            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-opacity-10 bg-primary">
                                <span className="fw-bold small">Notifications</span>
                                <Link to="/notifications" className="text-primary fw-bold text-decoration-none" style={{ fontSize: '0.75rem' }} onClick={() => setIsNotifyOpen(false)}>
                                    View All
                                </Link>
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center small text-muted">No new alerts</div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div 
                                            key={n._id} 
                                            className={`px-3 py-3 border-bottom small ${currentTheme === 'dark' ? 'bg-dark text-light border-secondary' : 'bg-white text-dark'}`}
                                            onClick={() => handleNotificationClick(n)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <strong className="text-primary">{n.title}</strong>
                                                <span className="p-1 bg-primary rounded-circle mt-1"></span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }} className="opacity-75">
                                                {n.message}
                                            </div>
                                            <div className="mt-2 text-end opacity-50" style={{ fontSize: '0.65rem' }}>
                                                {new Date(n.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Section (Already 40px) */}
                <div className="position-relative" ref={dropdownRef}>
                    <div className="d-flex align-items-center gap-2 ps-3 border-start border-secondary" style={{ cursor: 'pointer' }} 
                         onClick={() => {
                             setIsDropdownOpen(!isDropdownOpen);
                             setIsNotifyOpen(false);
                         }}>
                        <div className="text-end d-none d-sm-block">
                            <p className="m-0 small fw-bold" style={{ lineHeight: '1.2' }}>{user?.username || "Guest"}</p>
                            <p className="m-0 text-primary fw-semibold" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{user?.role}</p>
                        </div>
                        <div className="position-relative">
                            <div className={`rounded-circle d-flex align-items-center justify-content-center border ${currentTheme === 'dark' ? 'border-secondary' : 'border-light-subtle'}`}
                                style={{ width: "40px", height: "40px", backgroundColor: currentTheme === 'dark' ? '#2d3748' : '#f8f9fa' }}>
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/></svg>
                            </div>
                            <span className="position-absolute bottom-0 end-0 border-2 border-white rounded-circle bg-success" style={{ width: "12px", height: "12px" }}></span>
                        </div>
                    </div>

                    {isDropdownOpen && (
                        <div className={`position-absolute end-0 mt-2 shadow-lg rounded-3 py-2 ${currentTheme === 'dark' ? 'bg-dark border border-secondary text-light' : 'bg-white border text-dark'}`} style={{ width: "200px", zIndex: 1060 }}>
                            <Link to={`/user-files/${user?._id}`} className="dropdown-item px-3 py-2 small text-reset text-decoration-none d-block">👤 My Profile</Link>
                            <hr className="my-1 border-secondary" />
                            <button onClick={onLogout} className="dropdown-item px-3 py-2 small w-100 text-start border-0 bg-transparent text-danger fw-bold">🚪 Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;