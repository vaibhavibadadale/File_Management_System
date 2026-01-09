// routes/request.routes.js

const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');

// @route   POST /api/requests/create
router.post('/create', requestController.createRequest);

// @route   GET /api/requests/pending
router.get('/pending', requestController.getPendingDashboard);

// LINE 14: Ensure 'handleRequestAction' exists in your controller!
router.put('/:action/:id', requestController.handleRequestAction); 

module.exports = router;