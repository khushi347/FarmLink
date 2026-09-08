const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminController = require("../controllers/adminController");

// All admin routes strictly require authenticated admin role
router.use(auth, authorize("admin"));

// Dashboard metrics
router.get("/dashboard", adminController.getDashboard);

// Customers management
router.get("/customers", adminController.getCustomers);

// Shopkeepers management
router.post("/shopkeepers", adminController.createShopkeeper);
router.get("/shopkeepers", adminController.getShopkeepers);

// Shops management & activation
router.get("/shops", adminController.getShops);
router.patch("/shops/:id/status", adminController.toggleShopStatus);
router.patch("/shops/:id/toggle-status", adminController.toggleShopStatus);

// Products administrative visibility
router.get("/products", adminController.getProducts);

// Detailed inspections
router.get("/orders/:id", adminController.getOrderDetails);
router.get("/trips/:id", adminController.getTripDetails);

module.exports = router;