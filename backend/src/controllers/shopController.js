const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Notification = require("../models/Notification");
const seedShopkeeperDemo = require("../seed/seedShopkeeperDemo");

/**
 * Helper to calculate distance in km between two [lng, lat] coordinate pairs
 */
const calculateDistanceKm = (coords1, coords2) => {
    if (!coords1 || !coords2) return 15.0;
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.round(dist * 10) / 10;
};

/**
 * Get shop for the requesting authenticated shopkeeper.
 * If user or shop doesn't exist yet, lazily initializes the isolated demo shopkeeper dataset.
 */
const getShopForUser = async (req) => {
    const userId = req.user.userId || req.user.user;
    let shop = await Shop.findOne({ owner: userId });

    // If shop not found and user is demo shopkeeper, lazily seed demo dataset
    if (!shop) {
        const user = await User.findById(userId);
        if (user && (user.isDemo || user.email === "demo.shopkeeper@farmlink.local")) {
            const seeded = await seedShopkeeperDemo();
            shop = seeded.shop;
        }
    }

    if (!shop) {
        throw new Error("Shop not found for this user");
    }
    return shop;
};

/**
 * Format a trip document for rich frontend consumption
 */
const formatTrip = (trip, shopLocation) => {
    const tripObj = trip.toObject ? trip.toObject() : trip;
    const tripCenter = tripObj.centerLocation?.coordinates;
    const shopCoords = shopLocation?.coordinates || [77.4200, 23.2650];

    // Compute realistic distance or fallback
    let distanceKm = 18.4;
    if (tripCenter) {
        distanceKm = calculateDistanceKm(shopCoords, tripCenter);
        // Ensure distance is realistic (> 5 km)
        if (distanceKm < 5) distanceKm = Math.round((distanceKm + 12.4) * 10) / 10;
    }

    // Extract village/corridor
    let village = "Rampura";
    if (Array.isArray(tripObj.orders) && tripObj.orders.length > 0) {
        const firstOrder = tripObj.orders[0];
        if (firstOrder.farmer && typeof firstOrder.farmer === "object" && firstOrder.farmer.name) {
            // Find village if available
            if (firstOrder.farmer.whatsappNumber?.includes("11002")) village = "Bilkisganj";
            else if (firstOrder.farmer.whatsappNumber?.includes("11003")) village = "Phanda Hub";
            else if (firstOrder.farmer.whatsappNumber?.includes("11004")) village = "Berasia Corridor";
            else if (firstOrder.farmer.whatsappNumber?.includes("11005")) village = "Kolar Hub";
            else if (firstOrder.farmer.whatsappNumber?.includes("11006")) village = "Sehore East";
            else village = "Rampura";
        }
    }

    // Friendly code e.g. Trip #245
    const hexSlice = tripObj._id.toString().slice(-4).toUpperCase();
    const code = `Trip #${hexSlice}`;

    return {
        ...tripObj,
        id: tripObj._id,
        code,
        village,
        distanceKm,
        orderCount: Array.isArray(tripObj.orders) ? tripObj.orders.length : 0,
        estimatedEarnings: tripObj.estimatedEarnings || 0,
    };
};

/**
 * GET /api/shop/me — Get shopkeeper profile and associated shop details
 */
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.user;
        const user = await User.findById(userId).select("-password -refreshToken");
        const shop = await getShopForUser(req);

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isDemo: user.isDemo,
                },
                shop: {
                    id: shop._id,
                    shopName: shop.shopName,
                    phone: shop.phone,
                    village: shop.village,
                    category: shop.category,
                    location: shop.location,
                    isDemo: shop.isDemo,
                },
                isDemo: true,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/dashboard — Metrics aggregated purely from demo data
 */
exports.getDashboard = async (req, res) => {
    try {
        const shop = await getShopForUser(req);
        const shopId = shop._id;

        // Count available demo trips (OPEN, unassigned, isDemo: true, demoSessionId: null)
        const available = await TripBlock.countDocuments({
            assignedShop: null,
            status: "OPEN",
            isDemo: true,
            demoSessionId: null,
        });

        // Count active demo trips claimed by this shop
        const acceptedTrips = await TripBlock.countDocuments({
            assignedShop: shopId,
            status: "CLAIMED",
            isDemo: true,
        });

        // Count completed demo trips by this shop
        const completedTrips = await TripBlock.countDocuments({
            assignedShop: shopId,
            status: "COMPLETED",
            isDemo: true,
        });

        // Count total orders assigned to this demo shop
        const totalOrders = await Order.countDocuments({
            assignedShop: shopId,
            isDemo: true,
        });

        // Calculate revenue from completed demo trips
        const completedDocs = await TripBlock.find({
            assignedShop: shopId,
            status: "COMPLETED",
            isDemo: true,
        }).select("estimatedEarnings");

        let revenue = 0;
        completedDocs.forEach((t) => {
            revenue += t.estimatedEarnings || 0;
        });

        // Acceptance rate: (claimed + completed) / (available + claimed + completed)
        const totalOffered = available + acceptedTrips + completedTrips;
        const acceptanceRate = totalOffered > 0
            ? Math.round(((acceptedTrips + completedTrips) / totalOffered) * 100)
            : 100;

        // Unread notifications for this demo user
        const unreadNotifications = await Notification.countDocuments({
            user: req.user.userId || req.user.user,
            isRead: false,
            isDemo: true,
        });

        return res.status(200).json({
            success: true,
            data: {
                available,
                acceptedTrips,
                completedTrips,
                totalOrders,
                revenue,
                acceptanceRate,
                unreadNotifications,
                shopName: shop.shopName,
                village: shop.village,
                isDemo: true,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/trips/available — Available demo trips for claiming
 */
exports.getAvailableTrips = async (req, res) => {
    try {
        const shop = await getShopForUser(req);
        const { serviceType } = req.query;

        const filter = {
            status: "OPEN",
            assignedShop: null,
            isDemo: true, // Strict demo isolation
            demoSessionId: null, // Isolated from temporary visitor sessions
        };

        if (serviceType && serviceType !== "ALL") {
            filter.serviceType = serviceType;
        }

        const rawTrips = await TripBlock.find(filter)
            .populate({
                path: "orders",
                populate: { path: "farmer", select: "name whatsappNumber village language" },
            })
            .sort("-createdAt");

        const data = rawTrips.map((t) => formatTrip(t, shop.location));

        return res.status(200).json({
            success: true,
            totalTrips: data.length,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/trips/accepted — Active claimed demo trips
 */
exports.getAcceptedTrips = async (req, res) => {
    try {
        const shop = await getShopForUser(req);
        const { serviceType } = req.query;

        const filter = {
            status: "CLAIMED",
            assignedShop: shop._id,
            isDemo: true, // Strict demo isolation
        };

        if (serviceType && serviceType !== "ALL") {
            filter.serviceType = serviceType;
        }

        const rawTrips = await TripBlock.find(filter)
            .populate({
                path: "orders",
                populate: { path: "farmer", select: "name whatsappNumber village language" },
            })
            .sort("-claimedAt");

        const data = rawTrips.map((t) => formatTrip(t, shop.location));

        return res.status(200).json({
            success: true,
            totalTrips: data.length,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/trips/completed — Completed demo trips
 */
exports.getCompletedTrips = async (req, res) => {
    try {
        const shop = await getShopForUser(req);
        const { serviceType } = req.query;

        const filter = {
            status: "COMPLETED",
            assignedShop: shop._id,
            isDemo: true, // Strict demo isolation
        };

        if (serviceType && serviceType !== "ALL") {
            filter.serviceType = serviceType;
        }

        const rawTrips = await TripBlock.find(filter)
            .populate({
                path: "orders",
                populate: { path: "farmer", select: "name whatsappNumber village language" },
            })
            .sort("-completedAt");

        const data = rawTrips.map((t) => formatTrip(t, shop.location));

        return res.status(200).json({
            success: true,
            totalTrips: data.length,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/orders — Orders assigned to this demo shop
 */
exports.getOrders = async (req, res) => {
    try {
        const shop = await getShopForUser(req);
        const { status, serviceType } = req.query;

        const filter = {
            assignedShop: shop._id,
            isDemo: true,
        };

        if (status && status !== "ALL") filter.status = status;
        if (serviceType && serviceType !== "ALL") filter.serviceType = serviceType;

        const orders = await Order.find(filter)
            .populate("farmer", "name whatsappNumber language")
            .populate("tripBlock", "status scheduledDate serviceType")
            .sort("-createdAt");

        return res.status(200).json({
            success: true,
            totalOrders: orders.length,
            data: orders,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/revenue — Revenue metrics and breakdown of completed trips
 */
exports.getRevenue = async (req, res) => {
    try {
        const shop = await getShopForUser(req);

        const trips = await TripBlock.find({
            assignedShop: shop._id,
            status: "COMPLETED",
            isDemo: true,
        })
            .populate({
                path: "orders",
                populate: { path: "farmer", select: "name whatsappNumber" },
            })
            .sort("-completedAt");

        let totalRevenue = 0;
        const formattedTrips = trips.map((t) => {
            const formatted = formatTrip(t, shop.location);
            totalRevenue += formatted.estimatedEarnings;
            return formatted;
        });

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                completedTripsCount: formattedTrips.length,
                trips: formattedTrips,
                isDemo: true,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/shop/notifications — Shopkeeper demo notifications
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.user;
        const notifications = await Notification.find({
            user: userId,
            isDemo: true,
        }).sort("-createdAt");

        const unreadCount = notifications.filter((n) => !n.isRead).length;

        return res.status(200).json({
            success: true,
            unreadCount,
            data: notifications,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * PATCH /api/shop/notifications/:id/read — Mark a single notification read
 */
exports.markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.user;
        const { id } = req.params;

        const notif = await Notification.findOneAndUpdate(
            { _id: id, user: userId, isDemo: true },
            { isRead: true },
            { new: true }
        );

        if (!notif) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        return res.status(200).json({
            success: true,
            data: notif,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * POST /api/shop/notifications/mark-all-read — Mark all notifications read
 */
exports.markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.user;
        await Notification.updateMany(
            { user: userId, isDemo: true, isRead: false },
            { $set: { isRead: true } }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * POST /api/shop/demo/reset — Reset shopkeeper demo environment to original seed
 */
exports.resetDemoData = async (req, res) => {
    try {
        await seedShopkeeperDemo();
        return res.status(200).json({
            success: true,
            message: "Shopkeeper demo dataset reset successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};