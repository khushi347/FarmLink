const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const { buildTripRoute } = require("../utils/geoUtils");

/**
 * POST /api/admin/shopkeepers — Register a new shopkeeper
 */
const createShopkeeper = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: "shopkeeper",
        });

        return res.status(201).json({
            success: true,
            message: "Shopkeeper created successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
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
 * GET /api/admin/dashboard — Aggregated metrics for Admin Dashboard
 * Returns: totalCustomers, activeShops, ordersToday, activeTrips, completedDeliveries
 */
const getDashboard = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
            totalCustomers,
            activeShops,
            ordersToday,
            activeTrips,
            completedDeliveries,
        ] = await Promise.all([
            // 1. Total Customers (real Farmers)
            Farmer.countDocuments({ isDemo: { $ne: true } }),
            // 2. Active Shops (non-demo, isActive !== false)
            Shop.countDocuments({ isDemo: { $ne: true }, isActive: { $ne: false } }),
            // 3. Orders Today (real orders created since start of current day)
            Order.countDocuments({ isDemo: { $ne: true }, createdAt: { $gte: startOfToday } }),
            // 4. Active Trips (canonical Module 16 state: CLAIMED)
            TripBlock.countDocuments({ isDemo: { $ne: true }, status: "CLAIMED" }),
            // 5. Completed Deliveries (canonical Module 16 state: COMPLETED)
            TripBlock.countDocuments({ isDemo: { $ne: true }, status: "COMPLETED" }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalCustomers,
                activeShops,
                ordersToday,
                activeTrips,
                completedDeliveries,
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
 * PATCH /api/admin/shops/:id/toggle-status — Toggle shop active/inactive state
 */
const toggleShopStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shop ID format",
            });
        }

        const shop = await Shop.findById(id);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found",
            });
        }

        shop.isActive = shop.isActive === false ? true : false;
        await shop.save();

        return res.status(200).json({
            success: true,
            message: `Shop ${shop.isActive ? "activated" : "deactivated"} successfully`,
            shop,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/admin/customers — Paginated list of registered farmers with order counts
 */
const getCustomers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
        const matchQuery = { isDemo: { $ne: true } };

        const [total, farmers] = await Promise.all([
            Farmer.countDocuments(matchQuery),
            Farmer.aggregate([
                { $match: matchQuery },
                { $sort: { createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                    $lookup: {
                        from: "orders",
                        localField: "_id",
                        foreignField: "farmer",
                        as: "orders",
                    },
                },
                {
                    $project: {
                        _id: 1,
                        id: "$_id",
                        name: 1,
                        whatsappNumber: 1,
                        village: 1,
                        language: 1,
                        location: 1,
                        createdAt: 1,
                        orderCount: { $size: "$orders" },
                        totalOrders: { $size: "$orders" },
                    },
                },
            ]),
        ]);

        return res.status(200).json({
            success: true,
            data: farmers,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
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
 * GET /api/admin/shopkeepers — List all registered shopkeepers and their shops
 */
const getShopkeepers = async (req, res) => {
    try {
        const matchQuery = { role: "shopkeeper", isDemo: { $ne: true } };

        const shopkeepers = await User.aggregate([
            { $match: matchQuery },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "shops",
                    localField: "_id",
                    foreignField: "owner",
                    as: "shops",
                },
            },
            {
                $project: {
                    id: "$_id",
                    name: 1,
                    email: 1,
                    role: 1,
                    createdAt: 1,
                    shop: { $arrayElemAt: ["$shops", 0] },
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            count: shopkeepers.length,
            data: shopkeepers,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/admin/shops — List all shops with owner and active status
 */
const getShops = async (req, res) => {
    try {
        const shops = await Shop.find({ isDemo: { $ne: true } })
            .populate("owner", "name email phone role")
            .sort("-createdAt")
            .lean();

        return res.status(200).json({
            success: true,
            count: shops.length,
            data: shops.map((s) => ({
                id: s._id,
                shopName: s.shopName,
                category: s.category || [],
                phone: s.phone,
                village: s.village,
                location: s.location,
                isActive: s.isActive !== false,
                owner: s.owner
                    ? {
                          id: s.owner._id,
                          name: s.owner.name,
                          email: s.owner.email,
                      }
                    : null,
                createdAt: s.createdAt,
            })),
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/admin/products — Administrative visibility of categories and ordered products
 */
const getProducts = async (req, res) => {
    try {
        const categories = [
            "Seeds",
            "Fertilizer",
            "Pesticides",
            "Tractor Rental",
            "Water Tanker",
            "Machinery",
        ];

        const productStats = await Order.aggregate([
            { $match: { isDemo: { $ne: true } } },
            { $unwind: "$products" },
            {
                $group: {
                    _id: { name: "$products.name", unit: "$products.unit" },
                    totalOrderedQuantity: { $sum: "$products.quantity" },
                    orderCount: { $sum: 1 },
                    serviceTypes: { $addToSet: "$serviceType" },
                },
            },
            { $sort: { totalOrderedQuantity: -1 } },
        ]);

        const popularProducts = productStats.map((p) => ({
            name: p._id.name,
            unit: p._id.unit || "units",
            totalOrderedQuantity: p.totalOrderedQuantity,
            orderCount: p.orderCount,
            categories: p.serviceTypes,
        }));

        return res.status(200).json({
            success: true,
            data: {
                categories,
                supportedCategories: categories,
                popularProducts,
                productStats: popularProducts.map((p) => ({
                    _id: p.name,
                    name: p.name,
                    unit: p.unit,
                    totalQuantity: p.totalOrderedQuantity,
                    totalOrderedQuantity: p.totalOrderedQuantity,
                    orderCount: p.orderCount,
                    categories: p.categories,
                })),
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
 * GET /api/admin/orders/:id — Detailed order inspection
 */
const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format",
            });
        }

        const order = await Order.findById(id)
            .populate("farmer", "name whatsappNumber village language location")
            .populate("assignedShop", "shopName village phone location category")
            .populate("tripBlock", "status scheduledDate centerLocation serviceType");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * GET /api/admin/trips/:id — Detailed trip inspection with Module 15 waypoints
 */
const getTripDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid trip ID format",
            });
        }

        const trip = await TripBlock.findById(id)
            .populate({
                path: "orders",
                populate: { path: "farmer", select: "name whatsappNumber village location" },
            })
            .populate({
                path: "assignedShop",
                populate: { path: "owner", select: "name email phone" },
            });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found",
            });
        }

        const routeInfo = buildTripRoute(
            trip.assignedShop,
            trip.orders || [],
            trip.centerLocation?.coordinates || [77.4000, 23.2500]
        );

        return res.status(200).json({
            success: true,
            data: {
                ...trip.toObject(),
                routeInfo,
                routeDetails: routeInfo,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createShopkeeper,
    getDashboard,
    toggleShopStatus,
    getCustomers,
    getShopkeepers,
    getShops,
    getProducts,
    getOrderDetails,
    getTripDetails,
};