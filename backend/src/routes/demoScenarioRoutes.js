/**
 * demoScenarioRoutes.js — Routes for Recruiter-Facing Demo Scenarios
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/demoScenarioController");

// Presets for Scenario 1
router.get("/presets", controller.getPresets);

// Scenario 1: AI Order
router.post("/ai-order", controller.handleAiOrder);

// Scenario 2: Shared Delivery Grouping
router.post("/shared-delivery", controller.handleSharedDelivery);

// Scenario 3: Shop Competition
router.post("/shop-competition", controller.handleShopCompetition);

// Scenario 4: Realtime Notification
router.post("/realtime-notification", controller.handleRealtimeNotification);

// 1-Click Reset (Session-scoped)
router.delete("/reset", controller.handleReset);

module.exports = router;
