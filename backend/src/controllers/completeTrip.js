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

        // Create notification for this shopkeeper
        const code = `Trip #${trip._id.toString().slice(-4).toUpperCase()}`;
        await Notification.create({
            user: userId,
            title: "Delivery Completed",
            message: `${code} completed successfully. ₹${trip.estimatedEarnings || 0} credited to your revenue.`,
            type: "TripBlock",
            isDemo: trip.isDemo || false,
            metadata: { tripId: trip._id, code, earnings: trip.estimatedEarnings },
        });

        eventBus.emit("trip_completed", {
            tripId: trip._id,
            shopId: trip.assignedShop,
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