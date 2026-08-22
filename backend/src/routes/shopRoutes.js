const express=require("express");
const router=express.Router();

const shopController=require("../controllers/shopController.js");

router.get("/dashboard",shopController.getDashboard);
router.get("/trips/available",shopController.getAvailableTrips);
router.get("/trips/accepted",shopController.getAcceptedTrips);
router.get("/trips/completed",shopController.getCompletedTrips);
router.get("/orders",shopController.getOrders);
router.get("/orders",shopController.getOrders);
router.get("/revenue",shopController.getRevenue);

module.exports=router;

