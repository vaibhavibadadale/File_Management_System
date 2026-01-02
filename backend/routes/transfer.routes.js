const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');

// Routes for sending
router.post('/secure-send', transferController.secureTransfer);
router.post('/transfer', transferController.secureTransfer);

// Route for authority to see requests
router.get('/pending', transferController.getPendingTransfers);

// Route for authority to approve
router.put('/approve/:transferId', transferController.approveTransfer);

module.exports = router;