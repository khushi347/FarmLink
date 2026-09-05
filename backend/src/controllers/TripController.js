const claimTripService = require("../services/claimTripService");
const eventBus = require("../events/eventBus");
const Shop = require("../models/Shop");
const Notification = require("../models/Notification");

const claimTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.userId || req.user.user;
        const shop = await Shop.findOne({ owner: userId });
        if (!shop) return res.status(403).json({ success: false, message: "Shop not found" });
        const shopId = shop._id;

        const trip = await claimTripService(tripId, shopId);

        // Create notification for this shopkeeper
        const code = `Trip #${trip._id.toString().slice(-4).toUpperCase()}`;
        await Notification.create({
            user: userId,
            title: "Trip Claim Confirmed",
            message: `You claimed ${code}. This trip is no longer available to other shops.`,
            type: "TripBlock",
            isDemo: trip.isDemo || false,
            metadata: { tripId: trip._id, code },
        });

        eventBus.emit("trip_claimed", {
            tripId: trip._id,
            shopId: trip.assignedShop,
            isDemo: trip.isDemo || false,
        });

        return res.status(200).json({
            success: true,
            message: "Trip claimed successfully",
            trip,
        });
    } catch (error) {
        if (error.message === "Trip already claimed") {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = claimTrip;