import React, { useState, useEffect } from "react";
import { Container, Card, ListGroup, Badge, Button, Row, Col } from "react-bootstrap";
import { CheckCircle, Cancel, PendingActions, Notifications, DeleteSweep } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NotificationsPage = ({ currentTheme, user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = currentTheme === "dark";
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    // We need user role or ID to fetch history
    if (!user?._id && !user?.role) return;
    
    try {
      setLoading(true);
      // Sending both role and userId to match your backend $or query
      const res = await axios.get(`http://localhost:5000/api/notifications`, {
        params: { 
            userId: user._id,
            role: user.role 
        }
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
  }, [user?._id, user?.role]);

  const markAllAsRead = async () => {
    try {
      // Using your new backend endpoint for clearing the full list
      await axios.put(`http://localhost:5000/api/notifications/read-all`, { 
        userId: user._id,
        role: user.role 
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

const handleNotificationClick = async (notification) => {
    try {
        // 1. Mark as read in the database
        await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`);
        
        // 2. Local state update so it disappears from the list
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        setIsNotifyOpen(false);

        // 3. SMART REDIRECT LOGIC
        switch (notification.type) {
            case 'TRANSFER_REQUEST':
            case 'DELETE_REQUEST':
            case 'REQUEST_NEW':
                // Redirect to the Pending Requests page
                navigate('/pending-requests'); 
                break;

            case 'USER_CREATED':
            case 'NEW_USER':
                // Redirect to the Users Management/List page
                navigate('/users'); 
                break;

            case 'FILE_APPROVED':
            case 'FILE_REJECTED':
                // Redirect to the specific user's file view
                navigate(`/user-files/${user._id}`);
                break;

            default:
                // Fallback to a general notifications history page
                navigate('/notifications');
                break;
        }
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
      case 'REQUEST_NEW':
        return { icon: <PendingActions className="text-warning" />, bg: "rgba(255, 193, 7, 0.1)" };
      default:
        return { icon: <Notifications className="text-primary" />, bg: "transparent" };
    }
  };

  return (
    <Container className="py-4">
      <Card className={`shadow-sm border-0 ${isDark ? "bg-dark text-white" : ""}`}>
        <Card.Header className="d-flex justify-content-between align-items-center bg-transparent border-bottom py-3">
          <h4 className="mb-0 fw-bold">Notification History</h4>
          <Button variant="outline-primary" size="sm" onClick={markAllAsRead} disabled={notifications.length === 0}>
            <DeleteSweep className="me-1" /> Mark all as read
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-5">Loading your history...</div>
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
                        cursor: 'pointer',
                        transition: "0.2s" 
                    }}
                  >
                    <Row className="align-items-center">
                      <Col xs="auto" className="ps-4">{styles.icon}</Col>
                      <Col>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong className={`d-block ${!n.isRead ? 'text-primary' : ''}`}>
                                {n.title}
                            </strong>
                            <p className="mb-0 text-muted mt-1">{n.message}</p>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                              {new Date(n.createdAt).toLocaleDateString()}
                            </small>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                        </div>
                      </Col>
                      <Col xs="auto" className="pe-4">
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