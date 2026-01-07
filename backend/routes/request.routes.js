const express = require('express');
const router = express.Router();
// Import the whole controller object
const requestController = require('../controllers/request.controller');

// Path: /api/transfer/create
router.post('/create', requestController.createRequest);

// Path: /api/transfer/pending
// CHECK THIS LINE: ensure 'getPendingDashboard' exists in your controller
router.get('/pending', requestController.getPendingDashboard); 

// Path: /api/transfer/approve/:id or /deny/:id
router.put('/:action/:id', requestController.handleRequestAction);

module.exports = router;