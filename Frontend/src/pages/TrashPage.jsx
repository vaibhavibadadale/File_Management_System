import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Table, Button, Container, Card, Spinner, Badge, Alert } from "react-bootstrap";
import { FaTrashRestore, FaSkull, FaTrash, FaInfoCircle, FaUserShield } from "react-icons/fa";

const TrashPage = ({ user, currentTheme }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const deptId = user.departmentId?._id || user.departmentId;
      const res = await axios.get("http://localhost:5000/api/requests/trash", {
        params: {
          role: user.role?.toUpperCase(),
          departmentId: deptId,
        },
      });
      // The backend should return records from the 'Trash' or 'DeleteRequest' 
      // collection where status is 'completed'
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

  const handleRestore = async (id) => {
    if (!window.confirm("Restore this file to its original location?")) return;
    try {
      await axios.post(`http://localhost:5000/api/requests/trash/restore/${id}`);
      fetchTrash();
    } catch (err) {
      alert("Restore failed.");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("WARNING: This will permanently delete the file record. This cannot be undone!")) return;
    try {
      await axios.delete(`http://localhost:5000/api/requests/trash/permanent/${id}`);
      fetchTrash();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    <Container fluid className="mt-4 px-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className={currentTheme === "dark" ? "text-white" : "text-dark"}>
          <FaTrash className="me-2 text-danger" /> Recycle Bin
        </h4>
        <Badge bg="danger" pill className="px-3 py-2">{items.length} Items</Badge>
      </div>

      <Alert variant="info" className="d-flex align-items-center small py-2 border-0 shadow-sm">
        <FaInfoCircle className="me-2" />
        <div>
          <strong>System Logic:</strong> Completed delete requests are moved here. 
          HODs see departmental items; Admins & Superadmins see all records.
        </div>
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
                <th>FILE NAME</th>
                <th>DELETED BY</th>
                <th>APPROVED BY</th>
                <th>DEPARTMENT</th>
                <th>DATE DELETED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item._id} className="align-middle border-bottom">
                    <td className="fw-bold text-start ps-3">{item.originalName}</td>
                    <td className="small">{item.deletedBy}</td>
                    <td>
                      <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>
                        <FaUserShield className="me-1" /> {item.approvedBy || "Admin"}
                      </Badge>
                    </td>
                    <td className="text-primary small fw-bold">
                      {item.departmentName || "N/A"}
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
                    Recycle bin is empty.
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