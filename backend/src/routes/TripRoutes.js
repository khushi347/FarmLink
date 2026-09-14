const express = require("express");
const router = express.Router();

const tripController = require("../controllers/TripController");
const completeTrip = require("../controllers/completeTrip");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { validateObjectIdParam } = require("../middleware/validateRequest");

const validTripParam = validateObjectIdParam("tripId");

router.post("/:tripId/claim", validTripParam, auth, authorize("shopkeeper"), tripController.claimTrip || tripController);
router.post("/:tripId/out-for-delivery", validTripParam, auth, authorize("shopkeeper"), tripController.outForDelivery);
router.post("/:tripId/cancel", validTripParam, auth, authorize("shopkeeper"), tripController.cancelTrip);
router.post("/:tripId/reminder", validTripParam, auth, authorize("shopkeeper"), tripController.sendDeliveryReminder);
router.post("/:tripId/complete", validTripParam, auth, authorize("shopkeeper"), completeTrip);

module.exports = router;