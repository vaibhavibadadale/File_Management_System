const express = require("express");
const router = express.Router();
const requestController = require("../controllers/request.controller");

router.post("/create", requestController.createRequest);
router.post("/direct-delete", requestController.directAdminDelete); // Admin Bypass
router.get("/pending-dashboard", requestController.getPendingDashboard);
router.put("/approve/:id", requestController.approveRequest);
router.put("/deny/:id", requestController.denyRequest);

router.get("/trash", requestController.getTrashItems);
router.post("/trash/restore/:id", requestController.restoreFromTrash);
router.delete("/trash/permanent/:id", requestController.permanentDelete);

module.exports = router;