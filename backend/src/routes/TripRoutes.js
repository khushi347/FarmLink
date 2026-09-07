const express=require("express");
const router=express.Router();

const tripController=require("../controllers/TripController");
const completeTrip=require("../controllers/completeTrip");
const auth=require("../middleware/authMiddleware");
const authorize=require("../middleware/roleMiddleware");

router.post("/:tripId/claim", auth, authorize("shopkeeper"), tripController.claimTrip || tripController);
router.post("/:tripId/out-for-delivery", auth, authorize("shopkeeper"), tripController.outForDelivery);
router.post("/:tripId/cancel", auth, authorize("shopkeeper"), tripController.cancelTrip);
router.post("/:tripId/reminder", auth, authorize("shopkeeper"), tripController.sendDeliveryReminder);
router.post("/:tripId/complete", auth, authorize("shopkeeper"), completeTrip);

module.exports=router;