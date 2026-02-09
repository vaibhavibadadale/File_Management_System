const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const fileController = require("../controllers/file.controller");
const transferController = require('../controllers/transfer.controller');
const backupController = require('../controllers/backup.controller');

// 1. Upload
router.post("/upload", upload.single("file"), fileController.uploadFile);

// 2. Fetch
router.get("/", fileController.getFilesByFolder);

// 3. Star
router.patch('/star/:id', fileController.toggleFileStar);

// 4. Status Toggle
router.put("/toggle-status/:id", fileController.toggleFileStatus);

// 5. Track View
router.post("/track-view", fileController.trackView);

// 6. Bulk Delete
router.post("/bulk-delete", fileController.bulkDelete);

// 7. Delete (Single)
router.delete("/:id", fileController.softDeleteFile);

// 8. Transfer
router.post("/transfer", (req, res, next) => {
    const method = transferController.secureTransfer || transferController.createRequest;
    if (method) {
        return method(req, res, next);
    }
    res.status(500).send("Transfer handler missing");
});

// 9. Backup
router.get('/system-backup', backupController.generateSystemBackup);

module.exports = router;