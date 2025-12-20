const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.Controller');

// Define the endpoint
router.post('/secure-send', transferController.secureTransfer);
router.post('/transfer', transferController.secureTransfer);

module.exports = router;