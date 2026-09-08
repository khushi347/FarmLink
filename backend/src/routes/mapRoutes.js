const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// Map data endpoint (restricted to admin)
router.get("/data", auth, authorize("admin"), mapController.getMapData);

module.exports = router;
