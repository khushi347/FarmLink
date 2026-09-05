const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController.js");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// All shop routes require authenticated shopkeeper role
router.use(auth, authorize("shopkeeper"));

router.get("/me", shopController.getMe);
router.get("/dashboard", shopController.getDashboard);
router.get("/trips/available", shopController.getAvailableTrips);
router.get("/trips/accepted", shopController.getAcceptedTrips);
router.get("/trips/completed", shopController.getCompletedTrips);
router.get("/orders", shopController.getOrders);
router.get("/revenue", shopController.getRevenue);

// Notification endpoints
router.get("/notifications", shopController.getNotifications);
router.patch("/notifications/:id/read", shopController.markNotificationRead);
router.post("/notifications/mark-all-read", shopController.markAllNotificationsRead);

// Demo reset endpoint
router.post("/demo/reset", shopController.resetDemoData);

module.exports = router;
