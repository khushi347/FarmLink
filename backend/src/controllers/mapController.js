const User = require("../models/User");
const Farmer = require("../models/Farmer");
const Shop = require("../models/Shop");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");

/**
 * Helper to validate GeoJSON point coordinates
 * @param {Array} coords - [longitude, latitude]
 * @returns {boolean}
 */
const isValidCoordinates = (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return false;
    const [lng, lat] = coords;
    return (
        typeof lng === "number" &&
        typeof lat === "number" &&
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
};

/**
 * Controller to fetch all geographic data for the FarmLink map.
 * Supports filtering by role, status, or serviceType.
 */
exports.getMapData = async (req, res) => {
    try {
        const { serviceType, status } = req.query;

        // 1. Fetch Shops
        const shopsQuery = {};
        if (serviceType) {
            shopsQuery.category = serviceType;
        }
        const rawShops = await Shop.find(shopsQuery)
            .populate("owner", "name email role phone")
            .lean();

        const shops = [];
        for (const shop of rawShops) {
            if (shop.location && isValidCoordinates(shop.location.coordinates)) {
                const [lng, lat] = shop.location.coordinates;
                shops.push({
                    id: shop._id,
                    name: shop.shopName,
                    category: shop.category || [],
                    phone: shop.phone,
                    village: shop.village,
                    coordinates: [lat, lng], // Leaflet [lat, lng]
                    rawCoordinates: [lng, lat],
                    owner: shop.owner ? {
                        id: shop.owner._id,
                        name: shop.owner.name,
                        email: shop.owner.email,
                    } : null,
                    type: "shop"
                });
            }
        }

        // 2. Fetch Orders
        const ordersQuery = {};
        if (serviceType) ordersQuery.serviceType = serviceType;
        if (status) ordersQuery.status = status;

        const rawOrders = await Order.find(ordersQuery)
            .populate("farmer", "name whatsappNumber language")
            .populate("assignedShop", "shopName village location phone")
            .sort("-createdAt")
            .lean();

        const orders = [];
        for (const order of rawOrders) {
            if (order.location && isValidCoordinates(order.location.coordinates)) {
                const [lng, lat] = order.location.coordinates;
                orders.push({
                    id: order._id,
                    code: `FL-ORD-${order._id.toString().slice(-4).toUpperCase()}`,
                    serviceType: order.serviceType || "Fertilizer",
                    products: order.products || [],
                    status: order.status || "Pending",
                    requestedDate: order.requestedDate,
                    transcript: order.transcript || "",
                    audioUrl: order.audioUrl,
                    tripBlockId: order.tripBlock,
                    farmer: order.farmer ? {
                        id: order.farmer._id,
                        name: order.farmer.name || "Local Farmer",
                        phone: order.farmer.whatsappNumber,
                        language: order.farmer.language || "Hindi"
                    } : null,
                    assignedShop: order.assignedShop ? {
                        id: order.assignedShop._id,
                        name: order.assignedShop.shopName,
                        village: order.assignedShop.village
                    } : null,
                    coordinates: [lat, lng], // Leaflet [lat, lng]
                    rawCoordinates: [lng, lat],
                    type: "order"
                });
            }
        }

        // 3. Fetch TripBlocks
        const tripQuery = {};
        if (serviceType) tripQuery.serviceType = serviceType;
        if (status) tripQuery.status = status;

        const rawTrips = await TripBlock.find(tripQuery)
            .populate({
                path: "orders",
                select: "products serviceType location status requestedDate farmer",
                populate: { path: "farmer", select: "name whatsappNumber" }
            })
            .populate("assignedShop", "shopName village location phone")
            .sort("-createdAt")
            .lean();

        const tripBlocks = [];
        for (const trip of rawTrips) {
            if (trip.centerLocation && isValidCoordinates(trip.centerLocation.coordinates)) {
                const [cLng, cLat] = trip.centerLocation.coordinates;
                
                // Collect member order points
                const orderPoints = [];
                const populatedOrders = [];
                let totalWeightOrQty = 0;

                if (Array.isArray(trip.orders)) {
                    for (const o of trip.orders) {
                        if (o && typeof o === "object") {
                            if (o.location && isValidCoordinates(o.location.coordinates)) {
                                orderPoints.push([o.location.coordinates[1], o.location.coordinates[0]]);
                            }
                            if (Array.isArray(o.products)) {
                                o.products.forEach(p => {
                                    totalWeightOrQty += (p.quantity || 1);
                                });
                            }
                            populatedOrders.push({
                                id: o._id,
                                code: `FL-ORD-${o._id.toString().slice(-4).toUpperCase()}`,
                                products: o.products || [],
                                serviceType: o.serviceType,
                                status: o.status,
                                coordinates: o.location && isValidCoordinates(o.location.coordinates)
                                    ? [o.location.coordinates[1], o.location.coordinates[0]]
                                    : null
                            });
                        }
                    }
                }

                // Destination shop point
                let destPoint = null;
                if (trip.assignedShop?.location && isValidCoordinates(trip.assignedShop.location.coordinates)) {
                    destPoint = [
                        trip.assignedShop.location.coordinates[1],
                        trip.assignedShop.location.coordinates[0]
                    ];
                }

                tripBlocks.push({
                    id: trip._id,
                    code: `TB-${trip._id.toString().slice(-4).toUpperCase()}`,
                    serviceType: trip.serviceType,
                    status: trip.status || "OPEN",
                    scheduledDate: trip.scheduledDate,
                    estimatedEarnings: trip.estimatedEarnings || 0,
                    completedAt: trip.completedAt,
                    claimedAt: trip.claimedAt,
                    centerCoordinates: [cLat, cLng], // Leaflet [lat, lng]
                    rawCenterCoordinates: [cLng, cLat],
                    orderCount: populatedOrders.length,
                    totalQuantity: totalWeightOrQty,
                    orders: populatedOrders,
                    assignedShop: trip.assignedShop ? {
                        id: trip.assignedShop._id,
                        name: trip.assignedShop.shopName,
                        village: trip.assignedShop.village,
                        coordinates: destPoint
                    } : null,
                    corridor: {
                        originPoints: orderPoints,
                        centerPoint: [cLat, cLng],
                        destinationPoint: destPoint
                    },
                    type: "tripblock"
                });
            }
        }

        // 4. Compute statistics
        const stats = {
            totalShops: shops.length,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === "Pending").length,
            groupedOrders: orders.filter(o => o.status === "Grouped").length,
            openTripBlocks: tripBlocks.filter(t => t.status === "OPEN" || t.status === "Pending").length,
            claimedTripBlocks: tripBlocks.filter(t => t.status === "CLAIMED").length,
            completedTripBlocks: tripBlocks.filter(t => t.status === "COMPLETED").length,
        };

        return res.status(200).json({
            success: true,
            data: {
                shops,
                orders,
                tripBlocks,
                stats
            }
        });
    } catch (error) {
        console.error("Error fetching map data:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve map data",
            error: error.message
        });
    }
};
