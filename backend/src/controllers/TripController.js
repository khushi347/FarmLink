const claimTripService = require("../services/claimTripService");
const eventBus = require("../events/eventBus");
const Shop = require("../models/Shop");
const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const {
    ORDER_STATUS,
    TRIP_STATUS,
    validateTripTransition,
    withTransaction,
    InvalidStateTransitionError,
} = require("../services/lifecycleService");

/**
 * POST /api/trip-blocks/:tripId/claim — Claim an open trip block
 */
const claimTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.userId || req.user.user;
        const shop = await Shop.findOne({ owner: userId });
        if (!shop) return res.status(403).json({ success: false, message: "Shop not found" });
        const shopId = shop._id;

        const trip = await claimTripService(tripId, shopId);

        // Notify via eventBus (triggers persistent notification + farmer WhatsApp)
        eventBus.emit("trip_claimed", {
            tripId: trip._id,
            shopId: trip.assignedShop,
            userId,
            isDemo: trip.isDemo || false,
        });

        return res.status(200).json({
            success: true,
            message: "Trip claimed successfully",
            trip,
        });
    } catch (error) {
        if (
            error.message === "Trip already claimed" ||
            error.message === "Trip is no longer available"
        ) {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }

        if (error instanceof InvalidStateTransitionError) {
            return res.status(400).json({
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

/**
 * POST /api/trip-blocks/:tripId/out-for-delivery — Deprecated in Module 16
 */
const outForDelivery = async (req, res) => {
    return res.status(400).json({
        success: false,
        message: "The 'OUT_FOR_DELIVERY' step is deprecated and removed from the FarmLink lifecycle. Trips move directly from CLAIMED to COMPLETED.",
    });
};

/**
 * POST /api/trip-blocks/:tripId/cancel — Cancel an active trip block
 */
const cancelTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.userId || req.user.user;
        const shop = await Shop.findOne({ owner: userId });
        if (!shop) return res.status(403).json({ success: false, message: "Shop not found" });

        const trip = await TripBlock.findById(tripId);

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found",
            });
        }

        if (trip.assignedShop && String(trip.assignedShop) !== String(shop._id)) {
            return res.status(403).json({
                success: false,
                message: "Trip is not assigned to your shop",
            });
        }

        // Validate lifecycle transition (throws InvalidStateTransitionError if COMPLETED or CANCELLED)
        validateTripTransition(trip.status, TRIP_STATUS.CANCELLED);

        const reason = req.body?.reason || "Cancelled by shopkeeper";

        await withTransaction(async (session) => {
            trip.status = TRIP_STATUS.CANCELLED;
            await trip.save({ session });

            await Order.updateMany(
                { _id: { $in: trip.orders } },
                { $set: { status: ORDER_STATUS.CANCELLED } },
                { session }
            );
        });

        eventBus.emit("trip_cancelled", {
            tripId: trip._id,
            shopId: trip.assignedShop,
            userId,
            reason,
            isDemo: trip.isDemo || false,
        });

        return res.status(200).json({
            success: true,
            message: "Trip cancelled successfully",
            trip,
        });
    } catch (error) {
        if (error instanceof InvalidStateTransitionError) {
            return res.status(400).json({
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

/**
 * POST /api/trip-blocks/:tripId/reminder — Send a delivery reminder for an active trip
 */
const sendDeliveryReminder = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.userId || req.user.user;
        const shop = await Shop.findOne({ owner: userId });
        if (!shop) return res.status(403).json({ success: false, message: "Shop not found" });

        const trip = await TripBlock.findOne({
            _id: tripId,
            assignedShop: shop._id,
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found",
            });
        }

        const reminderText = req.body?.message || `Reminder: Delivery for Trip #${String(trip._id).slice(-4).toUpperCase()} is scheduled.`;

        eventBus.emit("delivery_reminder", {
            tripId: trip._id,
            shopId: trip.assignedShop,
            userId,
            isDemo: trip.isDemo || false,
            reminderText,
        });

        return res.status(200).json({
            success: true,
            message: "Delivery reminder dispatched successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

claimTrip.claimTrip = claimTrip;
claimTrip.outForDelivery = outForDelivery;
claimTrip.cancelTrip = cancelTrip;
claimTrip.sendDeliveryReminder = sendDeliveryReminder;

module.exports = claimTrip;