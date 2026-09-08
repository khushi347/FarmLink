const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const {
    ORDER_STATUS,
    TRIP_STATUS,
    validateTripTransition,
    withTransaction,
} = require("./lifecycleService");

const completeTripService = async (tripId, shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new Error("Shop not found");
    }

    const existingTrip = await TripBlock.findById(tripId);
    if (!existingTrip) {
        throw new Error("Trip not found");
    }

    // Validate lifecycle transition (throws InvalidStateTransitionError if not CLAIMED)
    validateTripTransition(existingTrip.status, TRIP_STATUS.COMPLETED);

    if (String(existingTrip.assignedShop) !== String(shopId)) {
        throw new Error("Trip is not assigned to your shop");
    }

    const query = {
        _id: tripId,
        status: TRIP_STATUS.CLAIMED,
        assignedShop: shopId,
    };

    if (shop.isDemo) {
        query.isDemo = true;
    } else {
        query.isDemo = { $ne: true };
    }

    // Atomically complete trip and child orders within transaction
    const completedTrip = await withTransaction(async (session) => {
        const trip = await TripBlock.findOneAndUpdate(
            query,
            {
                $set: {
                    status: TRIP_STATUS.COMPLETED,
                    completedAt: new Date(),
                },
            },
            {
                new: true,
                session,
            }
        );

        if (!trip) {
            throw new Error("Trip not assigned or already completed");
        }

        await Order.updateMany(
            { _id: { $in: trip.orders } },
            {
                $set: {
                    status: ORDER_STATUS.COMPLETED,
                },
            },
            { session }
        );

        return trip;
    });

    return completedTrip;
};

module.exports = completeTripService;