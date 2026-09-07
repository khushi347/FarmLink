const completeTripService = require("../services/completeTripService");
const eventBus = require("../events/eventBus");
const Shop = require("../models/Shop");
const Notification = require("../models/Notification");

const completeTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.userId || req.user.user;
        const shop = await Shop.findOne({ owner: userId });
        if (!shop) return res.status(403).json({ success: false, message: "Shop not found" });
        const shopId = shop._id;

        const trip = await completeTripService(tripId, shopId);

        eventBus.emit("trip_completed", {
            tripId: trip._id,
            shopId: trip.assignedShop,
            userId,
            isDemo: trip.isDemo || false,
        });

        return res.status(200).json({
            success: true,
            message: "Trip completed successfully",
            trip,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = completeTrip;