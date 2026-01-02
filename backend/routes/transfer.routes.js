const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');

// DEBUG: Add this line to see if the controller loaded correctly
console.log("Transfer Controller Functions:", transferController);

// POST: http://localhost:5000/api/transfer/secure-send
router.post('/secure-send', transferController.secureTransfer);

// GET: http://localhost:5000/api/transfer/pending
// This is likely where line 7 is - ensure it's not undefined!
router.get('/pending', transferController.getPendingTransfers);

// PUT: http://localhost:5000/api/transfer/approve/:transferId
router.put('/approve/:transferId', transferController.approveTransfer);

module.exports = router;
