const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const {
    ORDER_STATUS,
    TRIP_STATUS,
    validateTripTransition,
    withTransaction,
} = require("./lifecycleService");

const claimTripService = async (tripId, shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new Error("Shop not found");
    }

    if (shop.isActive === false) {
        throw new Error("Shop is currently inactive and cannot claim trips");
    }

    // Inspect trip to validate lifecycle eligibility
    const existingTrip = await TripBlock.findById(tripId);
    if (!existingTrip) {
        throw new Error("Trip not found");
    }

    // Validate lifecycle transition (throws InvalidStateTransitionError if already claimed or completed)
    validateTripTransition(existingTrip.status, TRIP_STATUS.CLAIMED);

    const query = {
        _id: tripId,
        status: { $in: [TRIP_STATUS.CREATED, "OPEN"] },
    };

    if (shop.isDemo) {
        query.isDemo = true;
    } else {
        query.isDemo = { $ne: true };
    }

    // Execute atomic claim and order status update inside transaction
    try {
        const claimedTrip = await withTransaction(async (session) => {
            const claim = await TripBlock.findOneAndUpdate(
                query,
                {
                    $set: {
                        status: TRIP_STATUS.CLAIMED,
                        assignedShop: shopId,
                        claimedAt: new Date(),
                    },
                },
                {
                    new: true,
                    session,
                }
            );

            if (!claim) {
                throw new Error("Trip is no longer available");
            }

            // Atomically update all child orders to CLAIMED and assign shop
            await Order.updateMany(
                { _id: { $in: claim.orders } },
                {
                    $set: {
                        status: ORDER_STATUS.CLAIMED,
                        assignedShop: shopId,
                    },
                },
                { session }
            );

            return claim;
        });

        return claimedTrip;
    } catch (error) {
        // Translate MongoDB transaction write conflicts into clean business errors
        const isWriteConflict =
            error.message &&
            (error.message.includes("Write conflict") ||
             error.message.includes("WriteConflict") ||
             (typeof error.hasErrorLabel === "function" && error.hasErrorLabel("TransientTransactionError")));

        if (isWriteConflict) {
            throw new Error("Trip is no longer available");
        }
        throw error;
    }
};

module.exports = claimTripService;