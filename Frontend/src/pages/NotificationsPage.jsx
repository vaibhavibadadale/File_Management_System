import React, { useState, useEffect } from "react";
import { Container, Card, ListGroup, Badge, Button, Row, Col, Spinner } from "react-bootstrap";
import { CheckCircle, Cancel, PendingActions, Notifications, DeleteSweep, PersonAdd, Share, DeleteForever } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NotificationsPage = ({ currentTheme, user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = currentTheme === "dark";
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      // Fetches notifications where recipientId matches logged-in user
      const res = await axios.get(`http://localhost:5000/api/notifications`, {
        params: { userId: user._id }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?._id]);

  const markAllAsRead = async () => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/read-all`, { 
        userId: user._id 
      });
      // Refresh list to show them as "read" or clear them depending on your preference
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
        // 1. Mark as read in the database
        if (!notification.isRead) {
            await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`);
        }

        // 2. SMART REDIRECT LOGIC based on our Backend Enums
        switch (notification.type) {
            case 'TRANSFER_REQUEST':
            case 'DELETE_REQUEST':
            case 'REQUEST_NEW':
                navigate('/pending-requests'); 
                break;

            case 'USER_CREATED':
                navigate('/users'); 
                break;

            case 'REQUEST_APPROVED':
            case 'REQUEST_DENIED':
                // Navigate to the user's personal dashboard/history
                navigate('/dashboard');
                break;

            default:
                break;
        }
        
        // Refresh to update UI (remove "New" badge)
        fetchNotifications();
    } catch (err) {
        console.error("Error during notification redirect:", err);
    }
  };

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'REQUEST_APPROVED':
        return { icon: <CheckCircle className="text-success" />, bg: "rgba(40, 167, 69, 0.1)" };
      case 'REQUEST_DENIED':
        return { icon: <Cancel className="text-danger" />, bg: "rgba(220, 53, 69, 0.1)" };
      case 'TRANSFER_REQUEST':
      case 'REQUEST_NEW':
        return { icon: <Share className="text-warning" />, bg: "rgba(255, 193, 7, 0.1)" };
      case 'DELETE_REQUEST':
        return { icon: <DeleteForever className="text-danger" />, bg: "rgba(220, 53, 69, 0.1)" };
      case 'USER_CREATED':
        return { icon: <PersonAdd className="text-info" />, bg: "rgba(23, 162, 184, 0.1)" };
      default:
        return { icon: <Notifications className="text-primary" />, bg: "transparent" };
    }
  };

  return (
    <Container className="py-4">
      <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
        <Card.Header className={`d-flex justify-content-between align-items-center bg-transparent border-bottom py-3 ${isDark ? "border-secondary" : ""}`}>
          <h4 className="mb-0 fw-bold">Notification History</h4>
          <Button 
            variant={isDark ? "outline-light" : "outline-primary"} 
            size="sm" 
            onClick={markAllAsRead} 
            disabled={notifications.length === 0}
          >
            <DeleteSweep className="me-1" /> Mark all as read
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading your notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <ListGroup variant="flush">
              {notifications.map((n) => {
                const styles = getNotificationStyles(n.type);
                return (
                  <ListGroup.Item
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`border-bottom py-3 ${isDark ? "bg-dark text-white border-secondary" : ""}`}
                    style={{ 
                        backgroundColor: !n.isRead ? styles.bg : "transparent",
                        cursor: 'pointer'
                    }}
                  >
                    <Row className="align-items-center g-0">
                      <Col xs="auto" className="px-3">{styles.icon}</Col>
                      <Col>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="pe-3">
                            <strong className={`d-block ${!n.isRead ? 'text-primary' : ''}`}>
                                {n.title}
                            </strong>
                            <p className="mb-0 text-muted small mt-1">{n.message}</p>
                          </div>
                          <div className="text-end" style={{ minWidth: '80px' }}>
                            <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                              {new Date(n.createdAt).toLocaleDateString()}
                            </small>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                        </div>
                      </Col>
                      <Col xs="auto" className="px-3">
                        {!n.isRead && <Badge pill bg="primary">New</Badge>}
                      </Col>
                    </Row>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          ) : (
            <div className="text-center p-5 text-muted">
              <Notifications sx={{ fontSize: 60, opacity: 0.2 }} />
              <p className="mt-3 fs-5">Your inbox is empty</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NotificationsPage;