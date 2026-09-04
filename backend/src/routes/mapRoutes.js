const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");
const auth = require("../middleware/authMiddleware");

// Map data endpoint
router.get("/data", auth, mapController.getMapData);

module.exports = router;
