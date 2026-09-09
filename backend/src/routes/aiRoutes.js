const express = require("express");
const router = express.Router();

const parseOrder = require("../controllers/aiController");
const aiAssistantController = require("../controllers/aiAssistantController");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.post("/parse-order", parseOrder);
router.post("/assistant", auth, authorize(["admin", "shopkeeper"]), aiAssistantController.handleAssistantQuery);

module.exports = router;