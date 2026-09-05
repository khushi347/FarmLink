const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const Shop = require("../models/Shop");

const completeTripService = async (tripId, shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new Error("Shop not found");
    }

    const query = {
        _id: tripId,
        status: "CLAIMED",
        assignedShop: shopId,
    };

    if (shop.isDemo) {
        query.isDemo = true;
    } else {
        query.isDemo = { $ne: true };
    }

    const trip = await TripBlock.findOneAndUpdate(
        query,
        {
            status: "COMPLETED",
            completedAt: new Date(),
        },
        {
            new: true,
        }
    );

    if (!trip) {
        throw new Error("Trip not assigned or already completed");
    }

    await Order.updateMany(
        { _id: { $in: trip.orders } },
        { $set: { status: "Completed" } }
    );

    return trip;
};

module.exports = completeTripService;