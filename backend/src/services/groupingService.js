const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const {
    ORDER_STATUS,
    TRIP_STATUS,
    normalizeOrderStatus,
    validateOrderTransition,
    withTransaction,
} = require("./lifecycleService");

const DELIVERY_WINDOW = 5 * 60 * 60 * 1000;

function filterByDeliveryWindow(currentOrder, nearbyOrders) {
    return nearbyOrders.filter((order) => {
        const currentTime = new Date(currentOrder.requestedDate || Date.now()).getTime();
        const orderTime = new Date(order.requestedDate || Date.now()).getTime();

        const difference = Math.abs(currentTime - orderTime);

        return difference <= DELIVERY_WINDOW;
    });
}

function calculateCenterLocation(orders) {
    let totalLongitude = 0;
    let totalLatitude = 0;

    for (const order of orders) {
        totalLongitude += order.location.coordinates[0];
        totalLatitude += order.location.coordinates[1];
    }

    return {
        type: "Point",
        coordinates: [
            totalLongitude / orders.length,
            totalLatitude / orders.length,
        ],
    };
}

const groupOrder = async (orderId) => {
    try {
        const currentOrder = await Order.findById(orderId);

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        const normalizedCurrent = normalizeOrderStatus(currentOrder.status);
        if (normalizedCurrent !== ORDER_STATUS.RECEIVED) {
            return {
                success: false,
                message: `Order is already in '${currentOrder.status}' status and cannot be grouped.`,
            };
        }

        // Validate transition using lifecycle validator
        validateOrderTransition(currentOrder.status, ORDER_STATUS.GROUPED);

        const nearbyOrders = await Order.find({
            _id: { $ne: currentOrder._id },
            status: { $in: [ORDER_STATUS.RECEIVED, "Pending"] },
            serviceType: currentOrder.serviceType,
            isDemo: currentOrder.isDemo ? true : { $ne: true },
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: currentOrder.location.coordinates,
                    },
                    $maxDistance: 10000,
                },
            },
        });

        const compatibleOrders = filterByDeliveryWindow(currentOrder, nearbyOrders);
        const ordersToGroup = [currentOrder, ...compatibleOrders];
        const centerLocation = calculateCenterLocation(ordersToGroup);
        const orderIds = ordersToGroup.map((order) => order._id);

        // Transactional execution: TripBlock creation + Orders status update
        const tripBlock = await withTransaction(async (session) => {
            const tripDoc = new TripBlock({
                orders: orderIds,
                serviceType: currentOrder.serviceType,
                scheduledDate: currentOrder.requestedDate || new Date(),
                centerLocation,
                status: TRIP_STATUS.CREATED,
                isDemo: Boolean(currentOrder.isDemo),
                demoSessionId: currentOrder.demoSessionId || null,
            });

            await tripDoc.save({ session });

            await Order.updateMany(
                { _id: { $in: orderIds } },
                {
                    $set: {
                        status: ORDER_STATUS.GROUPED,
                        tripBlock: tripDoc._id,
                    },
                },
                { session }
            );

            return tripDoc;
        });

        return {
            success: true,
            tripBlock,
        };
    } catch (error) {
        throw error;
    }
};

module.exports = groupOrder;