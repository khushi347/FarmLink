const express=require("express");
const router=express.Router();

const tripController=require("../controllers/TripController");

router.post("/:tripId/claim",tripController);

module.exports=router;