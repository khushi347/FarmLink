const express = require("express");
const router = express.Router();

const parseOrder = require("../controllers/aiController");

router.post("/parse-order", parseOrder);

module.exports = router;