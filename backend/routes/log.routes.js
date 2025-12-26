const express = require("express");
const router = express.Router();

const { getAllLogs } = require("../controllers/log.controller");

router.get("/", getAllLogs);

module.exports = router;
