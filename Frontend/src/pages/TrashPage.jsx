import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Table, Button, Container, Card, Spinner, Badge, Alert, Stack } from "react-bootstrap";
import { FaTrashRestore, FaSkull, FaTrash, FaInfoCircle, FaHistory } from "react-icons/fa";

const TrashPage = ({ user, currentTheme }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For bulk buttons

  // FETCH TRASH ITEMS
  const fetchTrash = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const deptId = user.departmentId?._id || user.departmentId;
      const userRole = user.role?.toUpperCase();

      const res = await axios.get("http://localhost:5000/api/requests/trash", {
        params: {
          role: userRole,
          departmentId: deptId,
          username: user.username 
        },
      });

      setItems(res.data);
    } catch (err) {
      console.error("Trash Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // RESTORE LOGIC - Triggers moving item from Trash collection back to File collection
  const handleRestore = async (id) => {
    if (!window.confirm("Restore this file to its original location?")) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/requests/restore/${id}`);
      alert(res.data.message || "File restored successfully!");
      fetchTrash(); // Refresh list to show file has left trash
    } catch (err) {
      alert(err.response?.data?.message || "Restore failed.");
    }
  };

  // PURGE (PERMANENT DELETE) LOGIC
  const handlePermanentDelete = async (id) => {
    if (!window.confirm("WARNING: This will permanently delete the file record. This cannot be undone!")) return;
    try {
      const res = await axios.delete(`http://localhost:5000/api/requests/permanent/${id}`);
      alert(res.data.message || "File purged permanently.");
      fetchTrash();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    }
  };

  // --- NEW: BULK ACTIONS ---
  const handleBulkAction = async (actionType) => {
    const confirmMsg = actionType === 'restore' 
      ? "Restore ALL items currently visible in your trash?" 
      : "PERMANENTLY DELETE ALL items in your trash? This cannot be reversed!";
    
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const deptId = user.departmentId?._id || user.departmentId;
      const endpoint = actionType === 'restore' ? 'restore-all' : 'empty';
      
      const res = await axios({
        method: actionType === 'restore' ? 'POST' : 'DELETE',
        url: `http://localhost:5000/api/requests/trash/${endpoint}`,
        params: {
          role: user.role?.toUpperCase(),
          departmentId: deptId,
          username: user.username
        }
      });

      alert(res.data.message);
      fetchTrash();
    } catch (err) {
      alert("Bulk action failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Container fluid className="mt-4 px-4 pb-5">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h4 className={currentTheme === "dark" ? "text-white mb-1" : "text-dark mb-1"}>
            <FaTrash className="me-2 text-danger" /> Recycle Bin
          </h4>
          <p className="text-muted small mb-0">Manage and recover deleted files</p>
        </div>

        {items.length > 0 && (
          <Stack direction="horizontal" gap={2}>
            <Button 
              variant="outline-success" 
              size="sm" 
              disabled={actionLoading}
              onClick={() => handleBulkAction('restore')}
            >
              <FaHistory className="me-1" /> Restore All
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              disabled={actionLoading}
              onClick={() => handleBulkAction('empty')}
            >
              <FaSkull className="me-1" /> Empty Trash
            </Button>
          </Stack>
        )}
      </div>

      <Alert variant="info" className="d-flex align-items-center small py-2 border-0 shadow-sm">
        <FaInfoCircle className="me-2" />
        <div>
          <strong>Hierarchical Control:</strong> 
          {user.role === "SUPERADMIN" && " You have full access to all deleted records."}
          {user.role === "ADMIN" && " Viewing items deleted by HODs and Employees."}
          {user.role === "HOD" && " Viewing items deleted by Employees in your department."}
          {user.role === "EMPLOYEE" && " Viewing your own deleted items."}
        </div>
        <Badge bg="info" pill className="ms-auto">{items.length} Total Items</Badge>
      </Alert>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2">Fetching deleted records...</p>
        </div>
      ) : (
        <Card className={`border-0 ${currentTheme === "dark" ? "bg-dark text-white shadow-lg" : "shadow-sm"}`}>
          <Table responsive hover variant={currentTheme === "dark" ? "dark" : "light"} className="text-center mb-0">
            <thead>
              <tr className="text-muted small border-bottom">
                <th className="text-start ps-3">FILE NAME</th>
                <th>DELETED BY</th>
                <th>ROLE</th>
                <th>DEPARTMENT</th>
                <th>DATE DELETED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item._id} className="align-middle border-bottom">
                    <td className="fw-bold text-start ps-3">{item.originalName || "Unnamed File"}</td>
                    <td className="small">{item.deletedBy}</td>
                    <td>
                      <Badge bg="info" style={{ fontSize: '0.65rem' }}>
                        {item.senderRole || "USER"}
                      </Badge>
                    </td>
                    <td className="text-primary small fw-bold">
                      {item.departmentName || "General"}
                    </td>
                    <td className="small">
                      {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "Recently"}
                    </td>
                    <td>
                      <div className="d-flex gap-2 justify-content-center">
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          onClick={() => handleRestore(item._id)}
                          title="Restore File"
                        >
                          <FaTrashRestore className="me-1" /> Restore
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handlePermanentDelete(item._id)}
                          title="Permanent Delete"
                        >
                          <FaSkull className="me-1" /> Purge
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-5 text-muted">
                    <FaTrash className="mb-2 d-block mx-auto opacity-25" size={30} />
                    No records found in the recycle bin.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      )}
    </Container>
  );
};

export default TrashPage;