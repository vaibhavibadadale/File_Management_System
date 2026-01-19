import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Container, Row, Col, Card, ListGroup, Badge, Spinner } from "react-bootstrap";
import { ClockHistory, CheckCircleFill, FileEarmarkText } from "react-bootstrap-icons";
import "./MyFilesPage.css"; 

function MyFilesPage({ user, username, currentTheme }) {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(username);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // New states for Dashboard integration
  const [dashboardData, setDashboardData] = useState({ recentlyViewed: [], recentActions: [] });
  const [loadingStats, setLoadingStats] = useState(true);
  const isDark = currentTheme === "dark";

  useEffect(() => {
    fetchFolders();
    fetchFiles(); // Added to load files in current folder
    fetchDashboardStats();
  }, [currentPath, user]);

  // --- NEW: Fetch Dashboard Stats ---
  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/requests/dashboard-stats`, {
        params: { userId: user?._id, username: username }
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // --- NEW: Track when a file is clicked ---
  const handleFileClick = async (file) => {
    try {
      await axios.post("http://localhost:5000/api/files/track-view", {
        fileId: file._id,
        userId: user?._id
      });
      fetchDashboardStats(); // Refresh the list
      toast.info(`Opening ${file.originalName}`);
    } catch (err) {
      console.error("Tracking error", err);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/folders/all");
      const userFolders = res.data.filter((f) => f.createdBy === username);
      setFolders(userFolders);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };

  const fetchFiles = async () => {
    try {
      // Assuming you have a folderId logic or fetch all for root
      const res = await axios.get("http://localhost:5000/api/files/all", {
          params: { userId: user?._id }
      });
      setFiles(res.data.files || []);
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return toast.error("Enter a folder name!");
    try {
      await axios.post("http://localhost:5000/api/folders/create", {
        name: newFolderName,
        createdBy: username,
      });
      toast.success("Folder created successfully!");
      setNewFolderName("");
      fetchFolders();
    } catch (err) {
      toast.error("Failed to create folder");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error("Select a file first!");
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("uploadedBy", user?._id);
    formData.append("username", username);
    formData.append("path", currentPath);

    try {
      const res = await axios.post("http://localhost:5000/api/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message || "File uploaded successfully!");
      setSelectedFile(null);
      fetchFiles();
      fetchDashboardStats(); // Refresh recent actions
    } catch (err) {
      toast.error("File upload failed!");
    }
  };

  return (
    <div className={`file-explorer-container p-4 ${isDark ? 'bg-dark text-white' : ''}`}>
      
      {/* --- DASHBOARD SECTION START --- */}
      <div className="dashboard-summary mb-5">
        <Row>
          {/* Recently Viewed (Top 6) */}
          <Col lg={12} className="mb-4">
             <Card className={`border-0 shadow-sm ${isDark ? 'bg-secondary bg-opacity-25 text-white' : 'bg-light'}`}>
                <Card.Body>
                    <h6 className="fw-bold mb-3"><ClockHistory className="me-2 text-primary"/> Recently Viewed</h6>
                    <div className="d-flex flex-wrap gap-3">
                        {dashboardData.recentlyViewed.map(file => (
                            <div key={file._id} className="text-center" style={{width: '100px'}}>
                                <div className="p-3 bg-white rounded shadow-sm mb-1 text-primary">
                                    <FileEarmarkText size={24}/>
                                </div>
                                <div className="small text-truncate fw-bold">{file.originalName}</div>
                            </div>
                        ))}
                    </div>
                </Card.Body>
             </Card>
          </Col>

          {/* Recent Completed Actions */}
          <Col lg={6}>
            <Card className={`border-0 shadow-sm ${isDark ? 'bg-secondary bg-opacity-25 text-white' : ''}`}>
                <Card.Body>
                    <h6 className="fw-bold mb-3"><CheckCircleFill className="me-2 text-success"/> Recent Actions</h6>
                    <ListGroup variant="flush">
                        {dashboardData.recentActions.map(action => (
                            <ListGroup.Item key={action._id} className="bg-transparent border-0 py-1 small px-0">
                                <Badge bg="success" className="me-2">DONE</Badge>
                                {action.requestType} - {action.fileIds?.length} files
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
      {/* --- DASHBOARD SECTION END --- */}

      <hr />

      <h2>📁 My Files — {username}</h2>

      <div className="file-toolbar mt-3">
        <div className="folder-controls">
          <input
            type="text"
            placeholder="Enter folder name..."
            className="form-control d-inline-block w-auto me-2"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleCreateFolder}>Create Folder</button>
        </div>

        <div className="upload-controls mt-2">
          <input
            type="file"
            className="form-control d-inline-block w-auto me-2"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          <button className="btn btn-success" onClick={handleUpload}>Upload File</button>
        </div>
      </div>

      <div className="file-grid mt-4">
        {folders.map((folder) => (
          <div key={folder._id} className="file-card folder" onClick={() => setCurrentPath(folder.path)}>
            📁 {folder.name}
          </div>
        ))}

        {files.map((file) => (
          <div key={file._id} className="file-card file" onClick={() => handleFileClick(file)}>
            📄 {file.originalName || file.originalname}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyFilesPage;