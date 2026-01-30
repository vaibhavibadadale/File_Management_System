import React, { useState, useEffect } from "react";
import { Container, Button, Card, Badge, Row, Col, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { 
  NotificationsActive, 
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

  // LOGO LOGIC - Assigns icons based on the notification title
  const getNotificationIcon = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("user")) return <PersonAdd className="text-primary" />;
    if (lowerTitle.includes("transfer")) return <SwapHoriz className="text-warning" />;
    if (lowerTitle.includes("delete")) return <DeleteForever className="text-danger" />;
    return <NotificationImportant className="text-info" />;
  };

  // INDIVIDUAL CLICK REDIRECTION
  const handleNotificationClick = async (notification) => {
    try {
        // 1. Mark as read in the database
        await axios.put(`http://localhost:5000/api/notifications/mark-read/${notification._id}`);
        
        // 2. Normalize strings (Lowercasing is critical for "TRANSFER" vs "transfer")
        const title = (notification.title || "").toLowerCase().trim();
        const msg = (notification.message || "").toLowerCase().trim();

        console.log("History Redirection for:", title);

        // 3. Routing Logic
        if (title.includes('user')) {
            navigate('/users');
        } 
        else if (
            title.includes('transfer') || 
            title.includes('request') || 
            title.includes('delete') || 
            msg.includes('requested') ||
            msg.includes('transfer')
        ) {
            navigate('/pending'); 
        } 
        // Note: In history page, if it doesn't match, we stay on the page
    } catch (err) {
        console.error("Redirection error from history:", err);
    }
};

  // DELETE ALL (Clears list and stays on current page)
  // DELETE ALL (Permanently removes from DB)
  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      ...swalConfig,
      title: 'Delete all notifications?',
      text: "This will permanently clear your notification history.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all'
    });

    if (result.isConfirmed) {
      try {
        // Change from .post to .delete and use the new endpoint
        await axios.delete(`http://localhost:5000/api/notifications/delete-all`, {
          params: { 
            userId: user?._id, 
            role: user?.role,
            department: user?.department // Important for HOD filtering
          }
        });
        
        setNotifications([]); // UI clears instantly
        Swal.fire({ ...swalConfig, title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire({ ...swalConfig, title: 'Error', text: 'Could not delete notifications.', icon: 'error' });
      }
    }
  };

  const cardStyle = isDark 
    ? { backgroundColor: "#2b3035", color: "#fff", border: "1px solid #495057" } 
    : { backgroundColor: "#fff", color: "#212529" };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <History className="me-2 text-primary" fontSize="large" />
          <h3 className={`mb-0 ${isDark ? "text-white" : "text-dark"}`}>Notification History</h3>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline-danger" onClick={handleDeleteAll} className="d-flex align-items-center">
            <DeleteSweep className="me-1" /> Delete All
          </Button>
        )}
      </div>

      <hr className={isDark ? "text-secondary" : ""} />

      {loading ? (
        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
      ) : notifications.length === 0 ? (
        <Card className={`text-center p-5 border-0 shadow-sm ${isDark ? "bg-dark text-light" : "bg-light"}`}>
          <NotificationImportant style={{ fontSize: "5rem", opacity: 0.1 }} />
          <h4 className="text-muted mt-3">Your inbox is empty</h4>
        </Card>
      ) : (
        <Row>
          {notifications.map((n) => (
            <Col md={12} key={n._id} className="mb-3">
              <Card 
                className="shadow-sm border-0" 
                style={{ ...cardStyle, cursor: 'pointer', borderLeft: '5px solid #007bff' }}
                onClick={() => handleNotificationClick(n)}
              >
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div className="me-3 p-2 rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                      {getNotificationIcon(n.title)}
                    </div>
                    <div>
                      <h5 className="mb-1" style={{ fontWeight: 'bold' }}>{n.title}</h5>
                      <p className="mb-0 opacity-75">{n.message}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <small className="d-block opacity-50 mb-2">
                      {new Date(n.createdAt).toLocaleDateString()} <br/>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                    <Badge bg="primary" pill>New</Badge>
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