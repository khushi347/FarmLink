const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");
const analyticsService = require("./analyticsService");
const { calculateDistanceKm, isValidCoordinates } = require("../utils/geoUtils");

/**
 * Deterministically scans for proximity grouping opportunities:
 * Identifies open TripBlocks (status CREATED) and unbatched orders (status RECEIVED)
 * within a 5 km radius with matching serviceType.
 *
 * @param {Object} options - { matchFilter: Object, corridorFilter: string|null }
 * @returns {Promise<Array>} List of factual recommendation objects
 */
const detectGroupingRecommendations = async ({ matchFilter, corridorFilter = null } = {}) => {
    // 1. Find open or active TripBlocks
    const tripQuery = {
        ...matchFilter,
        status: { $in: ["CREATED", "CLAIMED"] },
    };

    const trips = await TripBlock.find(tripQuery)
        .populate("assignedShop", "shopName village location")
        .populate("orders", "serviceType location products farmer");

    if (trips.length === 0) return [];

    // 2. Find ungrouped orders waiting in RECEIVED state
    const orderQuery = {
        ...matchFilter,
        status: "RECEIVED",
    };

    const ungroupedOrders = await Order.find(orderQuery)
        .populate("farmer", "name village whatsappNumber location");

    if (ungroupedOrders.length === 0) return [];

    const recommendations = [];

    // 3. For each open trip, check for nearby compatible ungrouped orders
    for (const trip of trips) {
        const tripCenter = trip.centerLocation?.coordinates || trip.assignedShop?.location?.coordinates;
        if (!isValidCoordinates(tripCenter)) continue;

        const matchingOrders = [];
        let closestDist = Infinity;

        for (const order of ungroupedOrders) {
            // Must have matching serviceType or general corridor compatibility
            if (order.serviceType !== trip.serviceType) continue;

            const orderCoords = order.location?.coordinates;
            if (!isValidCoordinates(orderCoords)) continue;

            const dist = calculateDistanceKm(tripCenter, orderCoords);

            // Proximity threshold: 5.0 km
            if (dist <= 5.0) {
                if (dist < closestDist) closestDist = dist;
                matchingOrders.push({
                    orderId: order._id.toString(),
                    orderCode: `FL-ORD-${order._id.toString().slice(-4).toUpperCase()}`,
                    customerName: order.farmer?.name || "Local Farmer",
                    village: order.farmer?.village || "Corridor Delivery Point",
                    serviceType: order.serviceType,
                    distanceToTripCenterKm: dist,
                });
            }
        }

        if (matchingOrders.length > 0) {
            const tripCode = `TB-${trip._id.toString().slice(-4).toUpperCase()}`;
            const corridor = trip.assignedShop?.village || "Regional Corridor";

            // If corridorFilter is specified, only include matching corridor
            if (corridorFilter && !corridor.toLowerCase().includes(corridorFilter.toLowerCase())) {
                continue;
            }

            // Estimate potential distance saved if these orders were added to this batch
            const individualDistSum = matchingOrders.reduce((acc, o) => acc + o.distanceToTripCenterKm, 0);
            const estIncrementalSharedDist = Math.round((matchingOrders.length * 1.8) * 10) / 10;
            const potentialSavingsKm = Math.max(0, Math.round((individualDistSum - estIncrementalSharedDist) * 10) / 10);

            recommendations.push({
                type: "GROUPING_OPPORTUNITY",
                tripId: trip._id.toString(),
                tripCode,
                serviceType: trip.serviceType,
                corridor,
                currentStatus: trip.status,
                existingOrderCount: trip.orders ? trip.orders.length : 0,
                ungroupedOrderCount: matchingOrders.length,
                orderCodes: matchingOrders.map((o) => o.orderCode),
                closestProximityKm: closestDist,
                potentialDistanceSavedKm: potentialSavingsKm,
                potentialCostSavedInr: Math.round(potentialSavingsKm * analyticsService.DELIVERY_COST_PER_KM * 100) / 100,
                factualDescription: `${matchingOrders.length} ungrouped ${trip.serviceType} order${matchingOrders.length > 1 ? "s are" : " is"} within ${closestDist} km of Trip ${tripCode} (${corridor}). Batching would save an estimated ${potentialSavingsKm} km of unbatched dispatch distance.`,
            });
        }
    }

    return recommendations;
};

/**
 * Builds factual structured context for Admin Coordinator:
 * - Platform KPIs
 * - Logistics savings
 * - Regional order demand distribution
 * - Active shops overview
 * - Deterministic grouping recommendations
 *
 * @param {boolean} isDemo
 * @returns {Promise<Object>}
 */
const getAdminStructuredContext = async (isDemo = false) => {
    const matchFilter = isDemo ? { isDemo: true } : { isDemo: { $ne: true } };

    const [platform, logistics, regionalOrders, activeShopsList, recommendations] = await Promise.all([
        analyticsService.getPlatformAnalytics({ days: 14, isDemo }),
        analyticsService.getLogisticsAnalytics({ isDemo }),
        // Regional demand breakdown
        Order.aggregate([
            { $match: matchFilter },
            {
                $lookup: {
                    from: "farmers",
                    localField: "farmer",
                    foreignField: "_id",
                    as: "farmerDoc",
                },
            },
            {
                $project: {
                    serviceType: 1,
                    status: 1,
                    village: { $ifNull: [{ $arrayElemAt: ["$farmerDoc.village", 0] }, "Rampura Corridor"] },
                },
            },
            {
                $group: {
                    _id: "$village",
                    orderCount: { $sum: 1 },
                    serviceTypes: { $addToSet: "$serviceType" },
                },
            },
            { $sort: { orderCount: -1 } },
            { $limit: 8 },
        ]),
        // Active shops overview
        Shop.find({ ...matchFilter, isActive: { $ne: false } })
            .select("shopName village phone category")
            .limit(10)
            .lean(),
        // Factual proximity recommendations
        detectGroupingRecommendations({ matchFilter }),
    ]);

    const regionalSummary = regionalOrders.map((r) => ({
        region: r._id,
        orderCount: r.orderCount,
        services: r.serviceTypes,
    }));

    return {
        audience: "admin_coordinator",
        period: "past_14_days",
        platformSummary: {
            dailyOrdersToday: platform.summary.dailyOrdersToday,
            totalOrders: platform.summary.totalOrders,
            ordersGrouped: platform.summary.ordersGrouped,
            groupingRatePercentage: platform.summary.ordersGroupedPercentage,
            tripsCreated: platform.summary.tripsCreated,
            activeShopsCount: platform.summary.activeShops,
            completedDeliveries: platform.summary.completedDeliveries,
            averageOrdersPerTrip: platform.summary.averageOrdersPerTrip,
        },
        logisticsSavings: {
            totalDeliveries: logistics.totalDeliveries,
            individualDistanceBaselineKm: logistics.totalIndividualDistanceKm,
            sharedSequentialDistanceKm: logistics.totalSharedDistanceKm,
            distanceSavedKm: logistics.totalDistanceSavedKm,
            distanceSavedPercentage: logistics.distanceSavedPercentage,
            estimatedFuelSavedInr: logistics.estimatedFuelSavedInr,
            estimatedDeliveryCostSavedInr: logistics.estimatedDeliveryCostSavedInr,
            corridorEfficiency: logistics.corridorBreakdown.map((c) => ({
                corridor: c.corridor,
                trips: c.tripsCount,
                savedKm: c.distanceSavedKm,
                savedCostInr: c.savedCostInr,
            })),
        },
        regionalDemand: regionalSummary,
        activeShops: activeShopsList.map((s) => ({
            id: s._id.toString(),
            name: s.shopName,
            village: s.village,
            categories: s.category || [],
        })),
        factualRecommendations: recommendations,
        assumptions: logistics.assumptions,
        isDemo: Boolean(isDemo),
    };
};

/**
 * Builds factual structured context strictly scoped for a single Shopkeeper:
 * - Shop revenue and payout history
 * - Completed and active trips
 * - Shop claim share rate
 * - Average trip distance & cooperative savings contribution
 * - Open broadcast pool trips in shopkeeper's corridor
 * - Corridor-specific grouping recommendations
 *
 * (Zero leakage of other shops' private revenue or private metrics)
 *
 * @param {string|ObjectId} shopId
 * @param {boolean} isDemo
 * @returns {Promise<Object>}
 */
const getShopkeeperStructuredContext = async (shopId, isDemo = false) => {
    const matchFilter = isDemo ? { isDemo: true } : { isDemo: { $ne: true } };

    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    const [shopAnalytics, availableTrips, recommendations] = await Promise.all([
        analyticsService.getShopAnalytics(shopId, isDemo),
        // Available open trips in shop's area
        TripBlock.find({
            ...matchFilter,
            assignedShop: null,
            status: { $in: ["CREATED", "OPEN"] },
        })
            .select("serviceType scheduledDate centerLocation orders")
            .limit(6)
            .lean(),
        // Recommendations scoped to this shopkeeper's corridor
        detectGroupingRecommendations({
            matchFilter,
            corridorFilter: shop.village,
        }),
    ]);

    return {
        audience: "partner_shopkeeper",
        shopInfo: {
            id: shop._id.toString(),
            name: shop.shopName,
            village: shop.village,
            categories: shop.category || [],
        },
        shopPerformance: {
            revenueInr: shopAnalytics.revenue,
            tripsCompleted: shopAnalytics.tripsCompleted,
            activeTripsCount: shopAnalytics.activeTrips,
            availableTripsCount: shopAnalytics.availableTrips,
            claimSharePercentage: shopAnalytics.claimShareRate,
            averageTripDistanceKm: shopAnalytics.averageTripDistanceKm,
            totalDistanceDeliveredKm: shopAnalytics.totalDistanceDeliveredKm,
            totalDistanceSavedKm: shopAnalytics.totalDistanceSavedKm,
            cooperativeSavingsContributedInr: shopAnalytics.cooperativeSavingsContributedInr,
            metricNote: shopAnalytics.metricExplanation,
        },
        availableCorridorsToClaim: availableTrips.map((t) => ({
            id: t._id.toString(),
            code: `TB-${t._id.toString().slice(-4).toUpperCase()}`,
            serviceType: t.serviceType,
            orderCount: t.orders ? t.orders.length : 0,
            scheduledDate: t.scheduledDate,
        })),
        factualRecommendations: recommendations,
        isDemo: Boolean(isDemo),
    };
};

module.exports = {
    detectGroupingRecommendations,
    getAdminStructuredContext,
    getShopkeeperStructuredContext,
};
