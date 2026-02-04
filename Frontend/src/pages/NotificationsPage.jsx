import React, { useState, useEffect } from "react";
import { Container, Button, Card, Badge, Row, Col, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { 
  DeleteSweep, 
  NotificationImportant, 
  PersonAdd, 
  SwapHoriz, 
  DeleteForever,
  History
} from "@mui/icons-material";
import axios from "axios";
import Swal from "sweetalert2";

const NotificationsPage = ({ user, currentTheme }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDark = currentTheme === "dark";

  // SweetAlert2 Theme Configuration
  const swalConfig = {
    background: isDark ? "#212529" : "#fff",
    color: isDark ? "#fff" : "#545454",
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/notifications`, {
        params: { userId: user?._id, role: user?.role }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // Assigns icons based on the notification title/type
  const getNotificationIcon = (title = "") => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("user")) return <PersonAdd className="text-primary" />;
    if (lowerTitle.includes("transfer")) return <SwapHoriz className="text-warning" />;
    if (lowerTitle.includes("delete")) return <DeleteForever className="text-danger" />;
    return <NotificationImportant className="text-info" />;
  };

  // HANDLER: Mark Read & Redirect
  const handleNotificationClick = async (notification) => {
    try {
        await axios.put(`http://localhost:5000/api/notifications/mark-read/${notification._id}`);
        
        const title = (notification.title || "").toLowerCase().trim();
        const msg = (notification.message || "").toLowerCase().trim();

        if (title.includes('user')) {
            navigate('/users');
        } 
        else if (
            title.includes('transfer') || 
            title.includes('request') || 
            title.includes('delete') || 
            msg.includes('requested')
        ) {
            navigate('/pending'); 
        } 
        else {
            // FALLBACK: If it's just a general info notification, stay on the page
            // but refresh the list to show it's been read.
            fetchNotifications(); 
        }

        setNotifications(prev => 
            prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
    } catch (err) {
        console.error("Navigation error:", err);
    }
};

  // HANDLER: Delete All History for this user/role
  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      ...swalConfig,
      title: 'Clear all history?',
      text: "This will permanently delete all your notifications.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/notifications/delete-all`, {
          params: { 
            userId: user?._id, 
            role: user?.role,
            department: user?.department 
          }
        });
        
        setNotifications([]); // Clear UI immediately
        Swal.fire({ ...swalConfig, title: 'History Cleared!', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire({ ...swalConfig, title: 'Error', text: 'Could not delete history.', icon: 'error' });
      }
    }
  };

  const cardStyle = isDark 
    ? { backgroundColor: "#2b3035", color: "#fff", border: "1px solid #495057" } 
    : { backgroundColor: "#fff", color: "#212529" };

  return (
    <Container className="py-4">
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <History className="me-2 text-primary" fontSize="large" />
          <h3 className={`mb-0 ${isDark ? "text-white" : "text-dark"}`}>Notification History</h3>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline-danger" onClick={handleDeleteAll} className="d-flex align-items-center fw-bold shadow-sm">
            <DeleteSweep className="me-1" /> Delete All
          </Button>
        )}
      </div>

      <hr className={isDark ? "text-secondary" : ""} />

      {/* CONTENT SECTION */}
      {loading ? (
        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
      ) : notifications.length === 0 ? (
        <Card className={`text-center p-5 border-0 shadow-sm ${isDark ? "bg-dark text-light" : "bg-light"}`}>
          <NotificationImportant style={{ fontSize: "5rem", opacity: 0.1 }} />
          <h4 className="text-muted mt-3">No notification history found.</h4>
        </Card>
      ) : (
        <Row>
          {notifications.map((n) => (
            <Col md={12} key={n._id} className="mb-3">
              <Card 
                className="shadow-sm border-0 transition-hover" 
                style={{ 
                    ...cardStyle, 
                    cursor: 'pointer', 
                    borderLeft: n.isRead ? '5px solid #6c757d' : '5px solid #007bff' 
                }}
                onClick={() => handleNotificationClick(n)}
              >
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div className={`me-3 p-2 rounded-circle d-flex align-items-center justify-content-center ${isDark ? "bg-dark" : "bg-light"}`} style={{ width: '45px', height: '45px' }}>
                      {getNotificationIcon(n.title)}
                    </div>
                    <div>
                      <h5 className="mb-1" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{n.title}</h5>
                      <p className="mb-0 opacity-75 small">{n.message}</p>
                    </div>
                  </div>
                  
                  <div className="text-end">
                    <small className="d-block opacity-50 mb-2" style={{ fontSize: '0.75rem' }}>
                      {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                    {!n.isRead && <Badge bg="primary" pill>New</Badge>}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default NotificationsPage;