const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const { calculateDistanceKm, buildTripRoute, isValidCoordinates } = require("../utils/geoUtils");

// Configurable environment assumptions with sensible defaults
const FUEL_SAVINGS_PER_KM = parseFloat(process.env.FUEL_SAVINGS_PER_KM) || 3.5;
const DELIVERY_COST_PER_KM = parseFloat(process.env.DELIVERY_COST_PER_KM) || 8.5;

// Calibrated fallback distance for orders with missing coordinates (average corridor radial dispatch in km)
const MISSING_COORD_FALLBACK_KM = 6.8;

/**
 * Calculates distance metrics for a single TripBlock:
 * - Individual Distance: sum of one-way Shop -> Customer distances
 * - Shared Distance: sequential route distance from buildTripRoute()
 * - Distance Saved: max(0, Individual - Shared)
 * - Estimated Fuel & Delivery Cost savings
 *
 * @param {Object} trip - Populated TripBlock document (with orders and assignedShop)
 * @returns {Object}
 */
const calculateTripDeliveryDistances = (trip) => {
    if (!trip) {
        return {
            individualDistanceKm: 0,
            sharedDistanceKm: 0,
            distanceSavedKm: 0,
            fuelSavedInr: 0,
            deliveryCostSavedInr: 0,
            deliveryRegion: "Regional Corridor",
            orderCount: 0,
        };
    }

    const shop = trip.assignedShop;
    const orders = Array.isArray(trip.orders) ? trip.orders : [];
    const centerCoords = trip.centerLocation?.coordinates || [77.4100, 23.2600];

    // Determine Shop Origin coordinates
    let originCoords = null;
    if (shop?.location && isValidCoordinates(shop.location.coordinates)) {
        originCoords = shop.location.coordinates;
    } else if (isValidCoordinates(centerCoords)) {
        originCoords = centerCoords;
    } else {
        originCoords = [77.4100, 23.2600];
    }

    // 1. Calculate Estimated Individual Delivery Distance
    // Sum of one-way Shop -> Customer radial distances for all orders in the trip
    let individualTotal = 0;
    for (const order of orders) {
        if (!order || typeof order !== "object") continue;

        if (order.location && isValidCoordinates(order.location.coordinates)) {
            const dist = calculateDistanceKm(originCoords, order.location.coordinates);
            individualTotal += dist;
        } else {
            // Safe fallback for orders with missing coordinates
            individualTotal += MISSING_COORD_FALLBACK_KM;
        }
    }
    const individualDistanceKm = Math.round(individualTotal * 10) / 10;

    // 2. Calculate Shared Delivery Distance using Module 15 buildTripRoute
    const routeInfo = buildTripRoute(shop, orders, centerCoords);
    const sharedDistanceKm = routeInfo.distanceKm || 0;

    // 3. Calculate Distance Saved
    // Guaranteed non-negative
    const distanceSavedKm = Math.max(
        0,
        Math.round((individualDistanceKm - sharedDistanceKm) * 10) / 10
    );

    // 4. Calculate Fuel & Delivery Cost Saved
    const fuelSavedInr = Math.round(distanceSavedKm * FUEL_SAVINGS_PER_KM * 100) / 100;
    const deliveryCostSavedInr = Math.round(distanceSavedKm * DELIVERY_COST_PER_KM * 100) / 100;

    return {
        individualDistanceKm,
        sharedDistanceKm,
        distanceSavedKm,
        fuelSavedInr,
        deliveryCostSavedInr,
        deliveryRegion: routeInfo.deliveryRegion || "Regional Corridor",
        orderCount: orders.length,
    };
};

/**
 * Platform Analytics:
 * - Daily Orders time-series
 * - Orders Grouped
 * - Trips Created
 * - Active Shops
 * - Completed Deliveries
 * - Average Orders / Trip
 *
 * @param {Object} options - { days: 14, isDemo: false }
 * @returns {Promise<Object>}
 */
const getPlatformAnalytics = async ({ days = 14, isDemo = false } = {}) => {
    const matchFilter = isDemo ? { isDemo: true } : { isDemo: { $ne: true } };

    const daysCount = Math.max(1, Math.min(60, parseInt(days) || 14));
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Run parallel aggregation and counts
    const [
        dailyOrdersRaw,
        dailyOrdersToday,
        totalOrders,
        ordersGrouped,
        tripsCreated,
        activeShops,
        completedDeliveries,
        tripStats,
    ] = await Promise.all([
        // 1. Daily Orders Time-Series
        Order.aggregate([
            {
                $match: {
                    ...matchFilter,
                    createdAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalOrders: { $sum: 1 },
                    groupedOrders: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["GROUPED", "CLAIMED", "COMPLETED"]] },
                                1,
                                0,
                            ],
                        },
                    },
                    completedOrders: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0],
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]),

        // 2. Daily Orders Today
        Order.countDocuments({
            ...matchFilter,
            createdAt: { $gte: startOfToday },
        }),

        // 3. Total Orders in system
        Order.countDocuments(matchFilter),

        // 4. Orders Grouped (canonical Module 16 states: GROUPED, CLAIMED, COMPLETED)
        Order.countDocuments({
            ...matchFilter,
            status: { $in: ["GROUPED", "CLAIMED", "COMPLETED"] },
        }),

        // 5. Trips Created (canonical Module 16 states: CREATED, CLAIMED, COMPLETED)
        TripBlock.countDocuments({
            ...matchFilter,
            status: { $in: ["CREATED", "CLAIMED", "COMPLETED"] },
        }),

        // 6. Active Shops
        Shop.countDocuments({
            ...matchFilter,
            isActive: { $ne: false },
        }),

        // 7. Completed Deliveries (canonical state: COMPLETED)
        TripBlock.countDocuments({
            ...matchFilter,
            status: "COMPLETED",
        }),

        // 8. Average Orders per Trip
        TripBlock.aggregate([
            {
                $match: {
                    ...matchFilter,
                    status: { $in: ["CREATED", "CLAIMED", "COMPLETED"] },
                },
            },
            {
                $project: {
                    orderCount: { $size: { $ifNull: ["$orders", []] } },
                },
            },
            {
                $group: {
                    _id: null,
                    avgOrders: { $avg: "$orderCount" },
                    totalGroupedOrders: { $sum: "$orderCount" },
                    totalTrips: { $sum: 1 },
                },
            },
        ]),
    ]);

    // Fill missing dates in dailyOrders timeseries with zeroed records
    const dailyMap = new Map();
    dailyOrdersRaw.forEach((row) => dailyMap.set(row._id, row));

    const timeseries = [];
    const loopDate = new Date(startDate);
    while (loopDate <= now) {
        const dateKey = loopDate.toISOString().slice(0, 10);
        const existing = dailyMap.get(dateKey);
        timeseries.push({
            date: dateKey,
            totalOrders: existing ? existing.totalOrders : 0,
            groupedOrders: existing ? existing.groupedOrders : 0,
            completedOrders: existing ? existing.completedOrders : 0,
        });
        loopDate.setDate(loopDate.getDate() + 1);
    }

    const averageOrdersPerTrip =
        tripStats.length > 0 && tripStats[0].avgOrders
            ? Math.round(tripStats[0].avgOrders * 10) / 10
            : 0;

    return {
        summary: {
            dailyOrdersToday,
            totalOrders,
            ordersGrouped,
            ordersGroupedPercentage:
                totalOrders > 0 ? Math.round((ordersGrouped / totalOrders) * 100) : 0,
            tripsCreated,
            activeShops,
            completedDeliveries,
            averageOrdersPerTrip,
        },
        timeseries,
        isDemo: Boolean(isDemo),
    };
};

/**
 * Logistics Metrics:
 * - Total Distance (Shared)
 * - Estimated Individual Delivery Distance
 * - Shared Delivery Distance
 * - Estimated Distance Saved
 * - Estimated Fuel/Delivery Cost Saved
 * - Corridor breakdown & parameterized assumptions
 *
 * @param {Object} options - { isDemo: false }
 * @returns {Promise<Object>}
 */
const getLogisticsAnalytics = async ({ isDemo = false } = {}) => {
    const matchFilter = isDemo ? { isDemo: true } : { isDemo: { $ne: true } };

    // Fetch all active/completed trips with populated shop and orders
    const trips = await TripBlock.find({
        ...matchFilter,
        status: { $in: ["CREATED", "CLAIMED", "COMPLETED"] },
    })
        .populate("assignedShop", "shopName village location")
        .populate({
            path: "orders",
            select: "farmer location serviceType products status",
            populate: { path: "farmer", select: "name whatsappNumber village location" },
        })
        .sort("-createdAt");

    let totalIndividualDistanceKm = 0;
    let totalSharedDistanceKm = 0;
    let totalDistanceSavedKm = 0;
    let totalDeliveries = 0;

    const corridorMap = new Map();

    trips.forEach((trip) => {
        const metrics = calculateTripDeliveryDistances(trip);

        totalIndividualDistanceKm += metrics.individualDistanceKm;
        totalSharedDistanceKm += metrics.sharedDistanceKm;
        totalDistanceSavedKm += metrics.distanceSavedKm;
        totalDeliveries += metrics.orderCount;

        // Group into corridor breakdown
        const region = metrics.deliveryRegion || "Regional Corridor";
        if (!corridorMap.has(region)) {
            corridorMap.set(region, {
                corridor: region,
                tripsCount: 0,
                deliveriesCount: 0,
                individualDistanceKm: 0,
                sharedDistanceKm: 0,
                distanceSavedKm: 0,
                savedCostInr: 0,
            });
        }
        const c = corridorMap.get(region);
        c.tripsCount += 1;
        c.deliveriesCount += metrics.orderCount;
        c.individualDistanceKm += metrics.individualDistanceKm;
        c.sharedDistanceKm += metrics.sharedDistanceKm;
        c.distanceSavedKm += metrics.distanceSavedKm;
        c.savedCostInr += metrics.deliveryCostSavedInr;
    });

    totalIndividualDistanceKm = Math.round(totalIndividualDistanceKm * 10) / 10;
    totalSharedDistanceKm = Math.round(totalSharedDistanceKm * 10) / 10;
    totalDistanceSavedKm = Math.round(totalDistanceSavedKm * 10) / 10;

    const distanceSavedPercentage =
        totalIndividualDistanceKm > 0
            ? Math.round((totalDistanceSavedKm / totalIndividualDistanceKm) * 1000) / 10
            : 0;

    const estimatedFuelSavedInr =
        Math.round(totalDistanceSavedKm * FUEL_SAVINGS_PER_KM * 100) / 100;
    const estimatedDeliveryCostSavedInr =
        Math.round(totalDistanceSavedKm * DELIVERY_COST_PER_KM * 100) / 100;

    const corridorBreakdown = Array.from(corridorMap.values()).map((c) => ({
        ...c,
        individualDistanceKm: Math.round(c.individualDistanceKm * 10) / 10,
        sharedDistanceKm: Math.round(c.sharedDistanceKm * 10) / 10,
        distanceSavedKm: Math.round(c.distanceSavedKm * 10) / 10,
        savedCostInr: Math.round(c.savedCostInr * 100) / 100,
    }));

    return {
        totalTripsEvaluated: trips.length,
        totalDeliveries,
        totalDistanceKm: totalSharedDistanceKm,
        totalSharedDistanceKm,
        totalIndividualDistanceKm,
        totalDistanceSavedKm,
        distanceSavedPercentage,
        estimatedFuelSavedInr,
        estimatedDeliveryCostSavedInr,
        corridorBreakdown,
        assumptions: {
            fuelCostPerKm: FUEL_SAVINGS_PER_KM,
            deliveryCostPerKm: DELIVERY_COST_PER_KM,
            baseline: "One-way Shop -> Customer radial dispatch",
            disclaimer:
                "Estimated savings based on one-way hub-to-destination radial dispatch model vs. sequenced multi-stop delivery routes. Not actual vehicle GPS tracks or recorded fuel receipts.",
        },
        isDemo: Boolean(isDemo),
    };
};

/**
 * Shop-Specific Analytics:
 * - Revenue
 * - Trips Completed
 * - Claim/Acceptance Metric (clearly labeled as Claim Share)
 * - Average Trip Distance
 * - Distance & Cooperative savings contributed
 *
 * @param {string|ObjectId} shopId
 * @param {boolean} isDemo
 * @returns {Promise<Object>}
 */
const getShopAnalytics = async (shopId, isDemo = false) => {
    const matchFilter = isDemo ? { isDemo: true } : { isDemo: { $ne: true } };

    // 1. Completed Trips
    const completedTrips = await TripBlock.find({
        ...matchFilter,
        assignedShop: shopId,
        status: "COMPLETED",
    })
        .populate("assignedShop", "shopName village location")
        .populate({
            path: "orders",
            select: "farmer location serviceType products status",
            populate: { path: "farmer", select: "name whatsappNumber village location" },
        })
        .sort("-completedAt");

    // 2. Active Trips
    const activeTripsCount = await TripBlock.countDocuments({
        ...matchFilter,
        assignedShop: shopId,
        status: "CLAIMED",
    });

    // 3. Available Trips in the corridor pool
    const availableTripsCount = await TripBlock.countDocuments({
        ...matchFilter,
        assignedShop: null,
        status: { $in: ["CREATED", "OPEN"] },
    });

    // 4. Financial Revenue
    let revenue = 0;
    let totalDistanceDeliveredKm = 0;
    let totalIndividualDistanceKm = 0;
    let totalDistanceSavedKm = 0;

    completedTrips.forEach((trip) => {
        revenue += trip.estimatedEarnings || 0;
        const metrics = calculateTripDeliveryDistances(trip);
        totalDistanceDeliveredKm += metrics.sharedDistanceKm;
        totalIndividualDistanceKm += metrics.individualDistanceKm;
        totalDistanceSavedKm += metrics.distanceSavedKm;
    });

    totalDistanceDeliveredKm = Math.round(totalDistanceDeliveredKm * 10) / 10;
    totalDistanceSavedKm = Math.round(totalDistanceSavedKm * 10) / 10;

    const tripsCompleted = completedTrips.length;
    const averageTripDistanceKm =
        tripsCompleted > 0
            ? Math.round((totalDistanceDeliveredKm / tripsCompleted) * 10) / 10
            : 0;

    const cooperativeSavingsContributedInr =
        Math.round(totalDistanceSavedKm * DELIVERY_COST_PER_KM * 100) / 100;
    const fuelSavingsInr =
        Math.round(totalDistanceSavedKm * FUEL_SAVINGS_PER_KM * 100) / 100;

    // Claim Share / Estimated Acceptance rate:
    // (Claimed + Completed) / (Available in Pool + Claimed + Completed)
    const totalOffered = availableTripsCount + activeTripsCount + tripsCompleted;
    const claimShareRate =
        totalOffered > 0
            ? Math.round(((activeTripsCount + tripsCompleted) / totalOffered) * 100)
            : 100;

    return {
        revenue,
        tripsCompleted,
        activeTrips: activeTripsCount,
        availableTrips: availableTripsCount,
        acceptanceRate: claimShareRate, // backwards compatible
        claimShareRate,
        metricLabel: "Claim Share / Estimated Acceptance",
        metricExplanation:
            "Measures the share of regional corridor trips claimed by your shop from the open broadcast pool. Note: FarmLink operates a broadcast pool and does not record individual shop rejection events.",
        averageTripDistanceKm,
        totalDistanceDeliveredKm,
        totalDistanceSavedKm,
        cooperativeSavingsContributedInr,
        fuelSavingsInr,
        assumptions: {
            deliveryCostPerKm: DELIVERY_COST_PER_KM,
            fuelCostPerKm: FUEL_SAVINGS_PER_KM,
        },
        isDemo: Boolean(isDemo),
    };
};

module.exports = {
    FUEL_SAVINGS_PER_KM,
    DELIVERY_COST_PER_KM,
    MISSING_COORD_FALLBACK_KM,
    calculateTripDeliveryDistances,
    getPlatformAnalytics,
    getLogisticsAnalytics,
    getShopAnalytics,
};
