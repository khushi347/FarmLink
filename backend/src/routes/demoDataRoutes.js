/**
 * demoDataRoutes.js — Express Router for Demo Data & Seed Management
 *
 * Public endpoints (scoped strictly by sessionId):
 *  - POST /api/demo/data/load-logistics
 *  - POST /api/demo/data/reset
 *  - GET  /api/demo/data/summary
 *
 * Protected endpoint (admin only, global development reset):
 *  - POST /api/demo/data/reset-global
 */

const express = require("express");
const router = express.Router();
const demoData = require("../controllers/demoDataController");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// Visitor session-scoped endpoints (public, strictly isolated by sessionId)
router.post("/load-logistics", demoData.loadLogisticsScenario);
router.post("/reset", demoData.resetSessionData);
router.get("/summary", demoData.getSummary);

// Protected development/admin endpoint (cleans global demo baseline demoSessionId: null)
router.post("/reset-global", auth, authorize("admin"), demoData.resetGlobalData);

module.exports = router;
