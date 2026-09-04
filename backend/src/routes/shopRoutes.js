const express=require("express");
const router=express.Router();

const shopController=require("../controllers/shopController.js");
const auth=require("../middleware/authMiddleware");
const authorize=require("../middleware/roleMiddleware");

router.use(auth, authorize("shopkeeper"));
router.get("/dashboard",shopController.getDashboard);
router.get("/trips/available",shopController.getAvailableTrips);
router.get("/trips/accepted",shopController.getAcceptedTrips);
router.get("/trips/completed",shopController.getCompletedTrips);
router.get("/orders",shopController.getOrders);
router.get("/revenue",shopController.getRevenue);

module.exports=router;

