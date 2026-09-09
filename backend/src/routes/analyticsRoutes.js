const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const analyticsController = require("../controllers/analyticsController");

// All platform and logistics analytics endpoints are strictly protected with admin RBAC
router.use(auth, authorize("admin"));

router.get("/platform", analyticsController.getPlatform);
router.get("/logistics", analyticsController.getLogistics);

module.exports = router;
