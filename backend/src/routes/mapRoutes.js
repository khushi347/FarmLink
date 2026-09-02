const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");

// Map data endpoint
router.get("/data", mapController.getMapData);

module.exports = router;
