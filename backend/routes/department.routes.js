const express = require("express");
const router = express.Router();

const {
  createDepartment,
  getAllDepartments
} = require("../controllers/department.controller");

router.post("/", createDepartment);
router.get("/", getAllDepartments);

module.exports = router;
