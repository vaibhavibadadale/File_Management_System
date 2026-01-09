const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');

// DEBUG: This will show you exactly what is missing in your terminal
console.log("Loading Transfer Routes. Available methods:", Object.keys(transferController));

const safeInvoke = (methodName) => (req, res, next) => {
    if (transferController[methodName]) {
        return transferController[methodName](req, res, next);
    }
    console.error(`ERROR: Method ${methodName} is missing in transfer.controller.js`);
    res.status(500).json({ error: `Server configuration error: ${methodName} missing` });
};

// Routes using the safe wrapper
router.post('/secure-send', transferController.createRequest);
router.get('/pending', transferController.getPendingTransfers);
// IMPORTANT: Use :transferId to match req.params.transferId in the controller
router.put('/approve/:transferId', transferController.approveTransfer);
router.put('/deny/:transferId', transferController.denyTransfer);
router.get('/received', transferController.getReceivedFiles);

module.exports = router;