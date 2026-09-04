const express=require("express");
const router=express.Router();

const tripController=require("../controllers/TripController");
const completeTrip=require("../controllers/completeTrip");
const auth=require("../middleware/authMiddleware");
const authorize=require("../middleware/roleMiddleware");

router.post("/:tripId/claim",auth,authorize("shopkeeper"),tripController);
router.post("/:tripId/complete",auth,authorize("shopkeeper"),completeTrip);

module.exports=router;