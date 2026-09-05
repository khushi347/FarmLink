const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const Shop = require("../models/Shop");

const claimTripService = async (tripId, shopId) => {
    // Check shop demo status for strict isolation
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new Error("Shop not found");
    }

    const query = {
        _id: tripId,
        status: "OPEN",
    };

    if (shop.isDemo) {
        query.isDemo = true;
    } else {
        query.isDemo = { $ne: true };
    }

    const claim = await TripBlock.findOneAndUpdate(
        query,
        {
            status: "CLAIMED",
            assignedShop: shopId,
            claimedAt: new Date(),
        },
        {
            new: true,
        }
    );

    if (!claim) {
        throw new Error("Trip already claimed");
    }

    await Order.updateMany(
        { _id: { $in: claim.orders } },
        { $set: { status: "Accepted", assignedShop: shopId } }
    );

    return claim;
};

module.exports = claimTripService;