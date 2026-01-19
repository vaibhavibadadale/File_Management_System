const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

/**
 * @route   POST /api/requests/create
 * @desc    Creates a new Transfer or Delete Request
 * @access  Employee / HOD / Admin
 */
router.post("/create", requestController.createRequest); 

/**
 * @route   GET /api/requests/pending-dashboard
 * @desc    Fetches requests based on role (HOD sees Dept, SuperAdmin sees All)
 * @access  HOD / Admin
 */
router.get("/pending-dashboard", requestController.getPendingDashboard);

/**
 * @route   GET /api/requests/my-requests
 * @desc    Fetches requests sent by the specific logged-in user
 * @access  Private
 */
router.get("/my-requests", requestController.getMyRequests);

/**
 * @route   PUT /api/requests/approve/:id
 * @desc    Approves a request (Moves files to Trash if delete, or to new user if transfer)
 */
router.put("/approve/:id", requestController.approveRequest);

/**
 * @route   PUT /api/requests/deny/:id
 * @desc    Denies a request with a comment
 */
router.put("/deny/:id", requestController.denyRequest);

/**
 * --- Trash Management ---
 * Note: Approve (Delete) moves files to a 'trash' state.
 * These routes manage that lifecycle.
 */

// Get all files marked as 'deleted' but not yet purged
router.get("/trash", requestController.getTrashItems);

// Restores a file from the trash back to its original folder
router.post("/trash/restore/:id", requestController.restoreFromTrash);

// Permanently removes the file from the server and database
router.delete("/trash/permanent/:id", requestController.permanentDelete);

module.exports = router;