const claimTripService = require("../services/claimTripService");
const eventBus = require("../events/eventBus");
const Shop = require("../models/Shop");
const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");

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

/**
 * POST /api/trip-blocks/:tripId/out-for-delivery — Mark a claimed trip as Out for Delivery
 */
const outForDelivery = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user.userId || req.user.user;
        const shop = await Shop.findOne({ owner: userId });
        if (!shop) return res.status(403).json({ success: false, message: "Shop not found" });

        const trip = await TripBlock.findOne({
            _id: tripId,
            assignedShop: shop._id,
            status: { $in: ["CLAIMED", "OPEN"] },
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found or not assigned to your shop",
            });
        }

        trip.status = "OUT_FOR_DELIVERY";
        await trip.save();

        await Order.updateMany(
            { _id: { $in: trip.orders } },
            { $set: { status: "Out for Delivery" } }
        );

        eventBus.emit("out_for_delivery", {
            tripId: trip._id,
            shopId: trip.assignedShop,
            userId,
            isDemo: trip.isDemo || false,
        });

        return res.status(200).json({
            success: true,
            message: "Trip is now out for delivery",
            trip,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
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

        const trip = await TripBlock.findOne({
            _id: tripId,
            assignedShop: shop._id,
            status: { $in: ["OPEN", "CLAIMED", "OUT_FOR_DELIVERY"] },
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found or not eligible for cancellation",
            });
        }

        const reason = req.body?.reason || "Cancelled by shopkeeper";
        trip.status = "CANCELLED";
        await trip.save();

        await Order.updateMany(
            { _id: { $in: trip.orders } },
            { $set: { status: "Cancelled" } }
        );

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