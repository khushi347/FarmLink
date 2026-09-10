/**
 * demoSeedService.js — Reusable, Deterministic Demo Data & Seed System
 *
 * Provides a standardized, reproducible demo dataset representing realistic
 * agricultural logistics in the Bhopal corridor:
 *  - Deterministic Personas (Farmers & Partner Shops)
 *  - Realistic Geospatial Clusters & Order Densities
 *  - Canonical Lifecycle States (CREATED, CLAIMED, COMPLETED)
 *  - Dual-Scope Reset Safety (Session-scoped vs Global development)
 *  - Strict Isolation from production analytics, metrics, and Twilio
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Notification = require("../models/Notification");
const { ORDER_STATUS, TRIP_STATUS } = require("./lifecycleService");

// ── CORRIDORS & GEOGRAPHIC ANCHORS (Bhopal Agricultural Belt) ─────────
const CORRIDORS = {
    RAMPURA: {
        name: "Rampura Hub",
        village: "Rampura",
        center: [77.4120, 23.2600], // [lng, lat]
        defaultService: "Seeds",
    },
    BILKISGANJ: {
        name: "Bilkisganj Corridor",
        village: "Bilkisganj",
        center: [77.3820, 23.2180],
        defaultService: "Fertilizer",
    },
    KOLAR: {
        name: "Kolar Corridor",
        village: "Kolar",
        center: [77.4110, 23.2420],
        defaultService: "Pesticides",
    },
    PHANDA: {
        name: "Phanda Hub",
        village: "Phanda",
        center: [77.4420, 23.2750],
        defaultService: "Seeds",
    },
};

// ── DETERMINISTIC SHOP PERSONAS ───────────────────────────────────────
const DEMO_SHOP_PERSONAS = [
    {
        key: "shop_a",
        userName: "FarmLink Shopkeeper",
        email: "shopkeeper@farmlink.com",
        name: "FarmLink Shopkeeper",
        shopName: "Kisan Krishi Kendra (Demo)",
        village: "Rampura",
        phone: "+91 98000 00014",
        category: ["Seeds", "Fertilizer", "Pesticides", "Machinery"],
        coordinates: [77.4200, 23.2650], // [lng, lat]
    },
    {
        key: "shop_b",
        userName: "Suresh Meena (Shop B)",
        email: "demo.shop.b@farmlink.internal",
        name: "Suresh Meena",
        shopName: "Green Valley Agro Store (Shop B)",
        village: "Kolar Corridor",
        phone: "+91 98000 00102",
        category: ["Fertilizer", "Machinery", "Seeds", "Pesticides"],
        coordinates: [77.4200, 23.2650],
    },
    {
        key: "shop_c",
        userName: "Anita Sharma (Shop C)",
        email: "demo.shop.c@farmlink.internal",
        name: "Anita Sharma",
        shopName: "Mohan Agro Mart (Shop C)",
        village: "Bhopal South",
        phone: "+91 98000 00103",
        category: ["Pesticides", "Tractor Rental", "Water Tanker", "Seeds"],
        coordinates: [77.4300, 23.2700],
    },
];

// ── DETERMINISTIC FARMER BASE PROFILES ────────────────────────────────
const FARMER_PROFILES = [
    { name: "Ramlal Gurjar", village: "Rampura", language: "Hindi", lngOffset: 0.0000, latOffset: 0.0000 },
    { name: "Shivraj Meena", village: "Bilkisganj", language: "Hindi", lngOffset: 0.0005, latOffset: 0.0004 },
    { name: "Devendra Singh", village: "Phanda", language: "Hindi", lngOffset: -0.0006, latOffset: 0.0005 },
    { name: "Kamal Patel", village: "Kolar", language: "Hindi", lngOffset: 0.0008, latOffset: -0.0004 },
    { name: "Anandi Bai", village: "Rampura", language: "Hindi", lngOffset: -0.0004, latOffset: -0.0003 },
    { name: "Mohanlal Rajput", village: "Bilkisganj", language: "Hindi", lngOffset: 0.0003, latOffset: 0.0007 },
];

/**
 * Generates a valid 10-digit Indian mobile number with +91 prefix
 * deterministically scoped to session to avoid unique index collisions.
 */
const getDeterministicPhone = (sessionId, index) => {
    if (!sessionId) {
        return `+91982601100${(index % 9) + 1}`;
    }
    const hash = (
        parseInt(
            crypto.createHash("md5").update(sessionId).digest("hex").slice(0, 4),
            16
        ) % 9000
    ) + 1000;
    const num = String(1000 + (index % 9000));
    return `+9198${hash}${num}`;
};

const getDeterministicPhoneNumber = (index, sessionId = null) => {
    return getDeterministicPhone(sessionId, index);
};

/**
 * Ensures demo shopkeeper users and shops exist.
 * Reusable across Module 20, Module 21, and Shopkeeper Portal.
 */
const ensureDemoShops = async () => {
    const shops = [];
    for (const p of DEMO_SHOP_PERSONAS) {
        let user = await User.findOne({ email: p.email });
        if (!user) {
            user = await User.create({
                name: p.name,
                email: p.email,
                password: "FarmLink123",
                role: "shopkeeper",
                isDemo: true,
            });
        } else {
            user.role = "shopkeeper";
            user.isDemo = true;
            await user.save();
        }

        let shop = await Shop.findOne({ owner: user._id });
        if (!shop) {
            shop = await Shop.findOne({ phone: p.phone });
            if (shop) {
                shop.owner = user._id;
                shop.isDemo = true;
                shop.shopName = p.shopName;
                shop.village = p.village;
                await shop.save();
            } else {
                shop = await Shop.create({
                    shopName: p.shopName,
                    owner: user._id,
                    category: p.category,
                    phone: p.phone,
                    village: p.village,
                    location: {
                        type: "Point",
                        coordinates: p.coordinates,
                    },
                    isDemo: true,
                    isActive: true,
                });
            }
        } else {
            shop.shopName = p.shopName;
            shop.village = p.village;
            shop.isDemo = true;
            await shop.save();
        }
        shops.push({ key: p.key, persona: p, user, shop });
    }
    return shops;
};

/**
 * Seeds or retrieves farmers for the given session.
 */
const ensureFarmersForSession = async (sessionId = null) => {
    const farmers = [];
    for (let i = 0; i < FARMER_PROFILES.length; i++) {
        const p = FARMER_PROFILES[i];
        const phone = getDeterministicPhoneNumber(i, sessionId);
        const filter = { whatsappNumber: phone };

        let farmer = await Farmer.findOne(filter);
        if (!farmer) {
            farmer = await Farmer.create({
                name: p.name,
                whatsappNumber: phone,
                language: p.language,
                isDemo: true,
                demoSessionId: sessionId || null,
            });
        }
        farmers.push({
            ...p,
            farmer,
            phone,
        });
    }
    return farmers;
};

/**
 * Loads the complete 19-order, 3-TripBlock logistics scenario for a session or global demo.
 *
 * Dataset breakdown:
 *  - Corridor 1 (Rampura): 6 Orders in RECEIVED state (compatible for grouping, unbatched)
 *  - Corridor 2 (Bilkisganj): 4 Orders in GROUPED state -> TripBlock 1 in CREATED state (available pool)
 *  - Corridor 3 (Kolar): 5 Orders in CLAIMED state -> TripBlock 2 in CLAIMED state (assigned to Shop A)
 *  - Corridor 4 (Phanda): 4 Orders in COMPLETED state -> TripBlock 3 in COMPLETED state (fulfilled by Shop C)
 *
 * @param {Object} options - { sessionId: string|null }
 * @returns {Promise<Object>} Summary of created logistics scenario
 */
const seedLogisticsScenario = async ({ sessionId = null } = {}) => {
    // 1. Clean existing records for this specific session first to guarantee reproducibility
    if (sessionId) {
        await resetSessionData(sessionId);
    }

    // 2. Ensure infrastructure (shops & farmers)
    const demoShops = await ensureDemoShops();
    const shopA = demoShops[0].shop;
    const shopC = demoShops[2].shop;
    const farmers = await ensureFarmersForSession(sessionId);

    const now = new Date();
    const deliveryTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const deliveryEarlier = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const createdOrders = [];
    const createdTrips = [];

    // Helper to generate a single order
    const createOrder = async ({
        farmerIndex,
        serviceType,
        productName,
        quantity,
        unit,
        corridorCenter,
        lngOffset,
        latOffset,
        requestedDate,
        status,
        assignedShopId = null,
    }) => {
        const fInfo = farmers[farmerIndex % farmers.length];
        const coordinates = [
            Number((corridorCenter[0] + lngOffset).toFixed(6)),
            Number((corridorCenter[1] + latOffset).toFixed(6)),
        ];

        const order = await Order.create({
            farmer: fInfo.farmer._id,
            serviceType,
            products: [{ name: productName, quantity, unit }],
            location: { type: "Point", coordinates },
            requestedDate,
            status,
            assignedShop: assignedShopId,
            isDemo: true,
            demoSessionId: sessionId || null,
        });

        createdOrders.push(order);
        return order;
    };

    // ─────────────────────────────────────────────────────────────────
    // CLUSTER 1: RAMPURA HUB (6 Orders, Status: RECEIVED, Unbatched)
    // Proximity: < 1.2 km radius, within 5h delivery window (Seeds)
    // ─────────────────────────────────────────────────────────────────
    const cluster1Center = CORRIDORS.RAMPURA.center;
    const cluster1Defs = [
        { farmerIdx: 0, product: "Wheat Seed (HD-2967)", qty: 50, unit: "kg", lng: 0.0000, lat: 0.0000 },
        { farmerIdx: 4, product: "Paddy Seed (Pusa Basmati)", qty: 75, unit: "kg", lng: 0.0012, lat: 0.0009 },
        { farmerIdx: 0, product: "Gram (Chana) Seed", qty: 30, unit: "kg", lng: -0.0008, lat: 0.0015 },
        { farmerIdx: 4, product: "Mustard Seed", qty: 25, unit: "kg", lng: 0.0018, lat: -0.0007 },
        { farmerIdx: 0, product: "Wheat Seed (HD-2967)", qty: 100, unit: "kg", lng: -0.0014, lat: -0.0011 },
        { farmerIdx: 4, product: "Paddy Seed (Pusa Basmati)", qty: 50, unit: "kg", lng: 0.0006, lat: 0.0021 },
    ];

    for (const def of cluster1Defs) {
        await createOrder({
            farmerIndex: def.farmerIdx,
            serviceType: "Seeds",
            productName: def.product,
            quantity: def.qty,
            unit: def.unit,
            corridorCenter: cluster1Center,
            lngOffset: def.lng,
            latOffset: def.lat,
            requestedDate: deliveryTomorrow,
            status: ORDER_STATUS.RECEIVED,
            assignedShopId: null,
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // CLUSTER 2: BILKISGANJ CORRIDOR (4 Orders, Status: GROUPED -> TripBlock: CREATED)
    // Proximity: < 1.5 km radius, Service: Fertilizer, Open pool
    // ─────────────────────────────────────────────────────────────────
    const cluster2Center = CORRIDORS.BILKISGANJ.center;
    const cluster2Defs = [
        { farmerIdx: 1, product: "Urea Fertilizer Bag", qty: 4, unit: "bags", lng: 0.0000, lat: 0.0000 },
        { farmerIdx: 5, product: "DAP Fertilizer Bag", qty: 6, unit: "bags", lng: 0.0011, lat: 0.0008 },
        { farmerIdx: 1, product: "MOP Potash Fertilizer", qty: 2, unit: "bags", lng: -0.0009, lat: 0.0012 },
        { farmerIdx: 5, product: "Urea Fertilizer Bag", qty: 5, unit: "bags", lng: 0.0015, lat: -0.0010 },
    ];

    const cluster2OrderIds = [];
    for (const def of cluster2Defs) {
        const order = await createOrder({
            farmerIndex: def.farmerIdx,
            serviceType: "Fertilizer",
            productName: def.product,
            quantity: def.qty,
            unit: def.unit,
            corridorCenter: cluster2Center,
            lngOffset: def.lng,
            latOffset: def.lat,
            requestedDate: deliveryTomorrow,
            status: ORDER_STATUS.GROUPED,
            assignedShopId: null,
        });
        cluster2OrderIds.push(order._id);
    }

    const trip1 = await TripBlock.create({
        orders: cluster2OrderIds,
        serviceType: "Fertilizer",
        assignedShop: null,
        scheduledDate: deliveryTomorrow,
        status: TRIP_STATUS.CREATED,
        estimatedEarnings: 620,
        centerLocation: { type: "Point", coordinates: cluster2Center },
        isDemo: true,
        demoSessionId: sessionId || null,
    });
    createdTrips.push(trip1);
    await Order.updateMany({ _id: { $in: cluster2OrderIds } }, { tripBlock: trip1._id });

    // ─────────────────────────────────────────────────────────────────
    // CLUSTER 3: KOLAR CORRIDOR (5 Orders, Status: CLAIMED -> TripBlock: CLAIMED)
    // Proximity: < 1.8 km radius, Service: Pesticides, Assigned to Shop A
    // ─────────────────────────────────────────────────────────────────
    const cluster3Center = CORRIDORS.KOLAR.center;
    const cluster3Defs = [
        { farmerIdx: 3, product: "Organic Bio-Pesticide", qty: 2, unit: "packets", lng: 0.0000, lat: 0.0000 },
        { farmerIdx: 4, product: "Chlorpyrifos 1L", qty: 3, unit: "bottles", lng: 0.0014, lat: 0.0007 },
        { farmerIdx: 3, product: "Mancozeb Fungicide", qty: 4, unit: "packets", lng: -0.0011, lat: 0.0013 },
        { farmerIdx: 4, product: "Neem Bio-Pesticide 2L", qty: 2, unit: "bottles", lng: 0.0019, lat: -0.0009 },
        { farmerIdx: 3, product: "Organic Bio-Pesticide", qty: 1, unit: "packets", lng: -0.0016, lat: -0.0012 },
    ];

    const cluster3OrderIds = [];
    for (const def of cluster3Defs) {
        const order = await createOrder({
            farmerIndex: def.farmerIdx,
            serviceType: "Pesticides",
            productName: def.product,
            quantity: def.qty,
            unit: def.unit,
            corridorCenter: cluster3Center,
            lngOffset: def.lng,
            latOffset: def.lat,
            requestedDate: deliveryTomorrow,
            status: ORDER_STATUS.CLAIMED,
            assignedShopId: shopA._id,
        });
        cluster3OrderIds.push(order._id);
    }

    const trip2 = await TripBlock.create({
        orders: cluster3OrderIds,
        serviceType: "Pesticides",
        assignedShop: shopA._id,
        scheduledDate: deliveryTomorrow,
        status: TRIP_STATUS.CLAIMED,
        claimedAt: new Date(now.getTime() - 45 * 60 * 1000), // claimed 45m ago
        estimatedEarnings: 740,
        centerLocation: { type: "Point", coordinates: cluster3Center },
        isDemo: true,
        demoSessionId: sessionId || null,
    });
    createdTrips.push(trip2);
    await Order.updateMany({ _id: { $in: cluster3OrderIds } }, { tripBlock: trip2._id });

    // ─────────────────────────────────────────────────────────────────
    // CLUSTER 4: PHANDA HUB (4 Orders, Status: COMPLETED -> TripBlock: COMPLETED)
    // Proximity: < 1.4 km radius, Service: Seeds, Fulfilled by Shop C
    // ─────────────────────────────────────────────────────────────────
    const cluster4Center = CORRIDORS.PHANDA.center;
    const cluster4Defs = [
        { farmerIdx: 2, product: "Paddy Seed (Pusa Basmati)", qty: 50, unit: "kg", lng: 0.0000, lat: 0.0000 },
        { farmerIdx: 2, product: "Wheat Seed (HD-2967)", qty: 50, unit: "kg", lng: 0.0013, lat: 0.0008 },
        { farmerIdx: 2, product: "Gram (Chana) Seed", qty: 25, unit: "kg", lng: -0.0010, lat: 0.0011 },
        { farmerIdx: 2, product: "Paddy Seed (Pusa Basmati)", qty: 75, unit: "kg", lng: 0.0016, lat: -0.0007 },
    ];

    const cluster4OrderIds = [];
    for (const def of cluster4Defs) {
        const order = await createOrder({
            farmerIndex: def.farmerIdx,
            serviceType: "Seeds",
            productName: def.product,
            quantity: def.qty,
            unit: def.unit,
            corridorCenter: cluster4Center,
            lngOffset: def.lng,
            latOffset: def.lat,
            requestedDate: deliveryEarlier,
            status: ORDER_STATUS.COMPLETED,
            assignedShopId: shopC._id,
        });
        cluster4OrderIds.push(order._id);
    }

    const trip3 = await TripBlock.create({
        orders: cluster4OrderIds,
        serviceType: "Seeds",
        assignedShop: shopC._id,
        scheduledDate: deliveryEarlier,
        status: TRIP_STATUS.COMPLETED,
        claimedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        completedAt: deliveryEarlier,
        estimatedEarnings: 580,
        centerLocation: { type: "Point", coordinates: cluster4Center },
        isDemo: true,
        demoSessionId: sessionId || null,
    });
    createdTrips.push(trip3);
    await Order.updateMany({ _id: { $in: cluster4OrderIds } }, { tripBlock: trip3._id });

    // ─────────────────────────────────────────────────────────────────
    // NOTIFICATIONS (4 Scoped Scenario Notifications)
    // ─────────────────────────────────────────────────────────────────
    const createdNotifs = await Notification.insertMany([
        {
            user: demoShops[0].user._id,
            title: "New TripBlock Available in Bilkisganj",
            message: "4 orders batched for Bilkisganj Corridor (₹620 estimated earnings). Open for claiming.",
            type: "TripBlock",
            channel: "IN_APP",
            deliveryStatus: "SENT",
            isRead: false,
            isDemo: true,
            metadata: { tripId: trip1._id, corridor: "Bilkisganj", sessionId, demoSessionId: sessionId, isDemoNotification: true },
        },
        {
            user: demoShops[0].user._id,
            title: "Trip Claim Confirmed",
            message: "TripBlock in Kolar Corridor successfully locked and assigned to your shop.",
            type: "TripBlock",
            channel: "IN_APP",
            deliveryStatus: "SENT",
            isRead: true,
            isDemo: true,
            metadata: { tripId: trip2._id, corridor: "Kolar", sessionId, demoSessionId: sessionId, isDemoNotification: true },
        },
        {
            user: demoShops[2].user._id,
            title: "Delivery Completed in Phanda Hub",
            message: "All 4 orders in Phanda Hub have been fulfilled successfully.",
            type: "TripBlock",
            channel: "IN_APP",
            deliveryStatus: "SENT",
            isRead: true,
            isDemo: true,
            metadata: { tripId: trip3._id, corridor: "Phanda", sessionId, demoSessionId: sessionId, isDemoNotification: true },
        },
        {
            user: demoShops[2].user._id,
            title: "Payout Credited: ₹580",
            message: "Payout for completed TripBlock in Phanda Hub cleared.",
            type: "System",
            channel: "SYSTEM",
            deliveryStatus: "SENT",
            isRead: true,
            isDemo: true,
            metadata: { tripId: trip3._id, earnings: 580, sessionId, demoSessionId: sessionId, isDemoNotification: true },
        },
    ]);

    return {
        success: true,
        sessionId,
        counts: {
            orders: createdOrders.length,
            tripBlocks: createdTrips.length,
            notifications: createdNotifs.length,
        },
        summary: {
            totalOrders: createdOrders.length, // 19
            totalTrips: createdTrips.length,   // 3
            totalNotifications: createdNotifs.length, // 4
            ordersByStatus: {
                RECEIVED: 6,
                GROUPED: 4,
                CLAIMED: 5,
                COMPLETED: 4,
            },
            tripsByStatus: {
                CREATED: 1,
                CLAIMED: 1,
                COMPLETED: 1,
            },
            corridors: ["Rampura Hub", "Bilkisganj Corridor", "Kolar Corridor", "Phanda Hub"],
        },
        tripIds: createdTrips.map((t) => t._id),
    };
};

/**
 * STRICT Session-Scoped Reset.
 * ONLY removes records matching { isDemo: true, demoSessionId: sessionId }.
 * Real non-demo records and other visitors' demo sessions are NEVER touched.
 */
const resetSessionData = async (sessionId) => {
    if (!sessionId || typeof sessionId !== "string") {
        throw new Error("A valid sessionId string is required for session reset.");
    }

    const sessionFilter = { isDemo: true, demoSessionId: sessionId };
    const notifFilter = {
        isDemo: true,
        $or: [
            { "metadata.sessionId": sessionId },
            { "metadata.demoSessionId": sessionId },
        ],
    };

    const [deletedOrders, deletedFarmers, deletedTrips, deletedNotifs] = await Promise.all([
        Order.deleteMany(sessionFilter),
        Farmer.deleteMany(sessionFilter),
        TripBlock.deleteMany(sessionFilter),
        Notification.deleteMany(notifFilter),
    ]);

    return {
        success: true,
        scope: "session",
        sessionId,
        deleted: {
            orders: deletedOrders.deletedCount,
            farmers: deletedFarmers.deletedCount,
            tripBlocks: deletedTrips.deletedCount,
            notifications: deletedNotifs.deletedCount,
        },
    };
};

/**
 * STRICT Global Development Reset (Admin / CLI only).
 * ONLY removes records matching { isDemo: true, demoSessionId: null } (baseline development dataset).
 * NEVER executes an unscoped deleteMany({}). Real records remain 100% untouched.
 */
const resetGlobalDemoData = async () => {
    const globalFilter = { isDemo: true, demoSessionId: null };
    const notifFilter = { isDemo: true, "metadata.sessionId": null };

    const [deletedOrders, deletedFarmers, deletedTrips, deletedNotifs] = await Promise.all([
        Order.deleteMany(globalFilter),
        Farmer.deleteMany(globalFilter),
        TripBlock.deleteMany(globalFilter),
        Notification.deleteMany(notifFilter),
    ]);

    return {
        success: true,
        scope: "global_development",
        deleted: {
            orders: deletedOrders.deletedCount,
            farmers: deletedFarmers.deletedCount,
            tripBlocks: deletedTrips.deletedCount,
            notifications: deletedNotifs.deletedCount,
        },
    };
};

/**
 * Retrieves summary metrics for a given session or global demo scope.
 */
const getDemoDataSummary = async (sessionId = null) => {
    const filter = { isDemo: true, demoSessionId: sessionId || null };
    const notifFilter = {
        isDemo: true,
        ...(sessionId
            ? {
                  $or: [
                      { "metadata.sessionId": sessionId },
                      { "metadata.demoSessionId": sessionId },
                  ],
              }
            : { "metadata.sessionId": null }),
    };

    const [
        totalOrders,
        ordersReceived,
        ordersGrouped,
        ordersClaimed,
        ordersCompleted,
        tripsCreated,
        tripsClaimed,
        tripsCompleted,
        totalNotifications,
    ] = await Promise.all([
        Order.countDocuments(filter),
        Order.countDocuments({ ...filter, status: ORDER_STATUS.RECEIVED }),
        Order.countDocuments({ ...filter, status: ORDER_STATUS.GROUPED }),
        Order.countDocuments({ ...filter, status: ORDER_STATUS.CLAIMED }),
        Order.countDocuments({ ...filter, status: ORDER_STATUS.COMPLETED }),
        TripBlock.countDocuments({ ...filter, status: TRIP_STATUS.CREATED }),
        TripBlock.countDocuments({ ...filter, status: TRIP_STATUS.CLAIMED }),
        TripBlock.countDocuments({ ...filter, status: TRIP_STATUS.COMPLETED }),
        Notification.countDocuments(notifFilter),
    ]);

    const totalTrips = tripsCreated + tripsClaimed + tripsCompleted;

    return {
        success: true,
        sessionId,
        isDemo: true,
        orders: {
            total: totalOrders,
            received: ordersReceived,
            grouped: ordersGrouped,
            claimed: ordersClaimed,
            completed: ordersCompleted,
            byStatus: {
                RECEIVED: ordersReceived,
                GROUPED: ordersGrouped,
                CLAIMED: ordersClaimed,
                COMPLETED: ordersCompleted,
            },
        },
        trips: {
            total: totalTrips,
            created: tripsCreated,
            claimed: tripsClaimed,
            completed: tripsCompleted,
            byStatus: {
                CREATED: tripsCreated,
                CLAIMED: tripsClaimed,
                COMPLETED: tripsCompleted,
            },
        },
        tripBlocks: {
            total: totalTrips,
            created: tripsCreated,
            claimed: tripsClaimed,
            completed: tripsCompleted,
            byStatus: {
                CREATED: tripsCreated,
                CLAIMED: tripsClaimed,
                COMPLETED: tripsCompleted,
            },
        },
        notifications: {
            total: totalNotifications,
        },
    };
};

/**
 * Seeds the comprehensive demo dataset for the Shopkeeper Portal (shopkeeper@farmlink.com).
 * Reusable and aligned with Module 21 architecture.
 * Canonical Lifecycle States ONLY: CREATED, CLAIMED, COMPLETED.
 */
const seedShopkeeperPortalDemo = async ({ userEmail = "shopkeeper@farmlink.com" } = {}) => {
    // 1. Ensure user
    let user = await User.findOne({ email: userEmail });
    if (!user) {
        user = await User.create({
            name: "FarmLink Shopkeeper",
            email: userEmail,
            password: "FarmLink123",
            role: "shopkeeper",
            isDemo: true,
        });
    } else {
        user.role = "shopkeeper";
        user.isDemo = true;
        await user.save();
    }

    // 2. Ensure shop
    let shop = await Shop.findOne({ owner: user._id });
    if (!shop) {
        shop = await Shop.findOne({ phone: "+91 98000 00014" });
        if (shop) {
            shop.owner = user._id;
            shop.isDemo = true;
            shop.shopName = "Kisan Krishi Kendra (Demo)";
            shop.village = "Rampura";
            await shop.save();
        } else {
            shop = await Shop.create({
                shopName: "Kisan Krishi Kendra (Demo)",
                owner: user._id,
                category: ["Seeds", "Fertilizer", "Pesticides", "Machinery"],
                phone: "+91 98000 00014",
                village: "Rampura",
                location: {
                    type: "Point",
                    coordinates: [77.4200, 23.2650],
                },
                isDemo: true,
                isActive: true,
            });
        }
    } else {
        shop.shopName = "Kisan Krishi Kendra (Demo)";
        shop.village = "Rampura";
        shop.isDemo = true;
        await shop.save();
    }

    // 3. Clear existing demo trips, orders, farmers, notifications for clean state
    // Strictly scoped: isDemo: true and demoSessionId: null
    await TripBlock.deleteMany({ isDemo: true, demoSessionId: null });
    await Order.deleteMany({ isDemo: true, demoSessionId: null });
    await Farmer.deleteMany({ isDemo: true, demoSessionId: null });
    await Notification.deleteMany({ isDemo: true, user: user._id });

    // 4. Create Demo Farmers
    const farmerDefs = [
        { name: "Ramlal Gurjar", village: "Rampura", phone: "+91 98260 11001", lng: 77.4120, lat: 23.2600 },
        { name: "Shivraj Meena", village: "Bilkisganj", phone: "+91 98260 11002", lng: 77.3820, lat: 23.2180 },
        { name: "Devendra Singh", village: "Phanda Hub", phone: "+91 98260 11003", lng: 77.4420, lat: 23.2750 },
        { name: "Kamal Patel", village: "Berasia Corridor", phone: "+91 98260 11004", lng: 77.4560, lat: 23.3220 },
        { name: "Anandi Bai", village: "Kolar Hub", phone: "+91 98260 11005", lng: 77.4110, lat: 23.2420 },
        { name: "Mohanlal Rajput", village: "Sehore East", phone: "+91 98260 11006", lng: 77.3500, lat: 23.2000 },
    ];

    const createdFarmers = {};
    for (const f of farmerDefs) {
        let farmer = await Farmer.findOne({ whatsappNumber: f.phone });
        if (!farmer) {
            farmer = await Farmer.create({
                name: f.name,
                whatsappNumber: f.phone,
                language: "Hindi",
                isDemo: true,
                demoSessionId: null,
            });
        }
        createdFarmers[f.village] = { farmer, lng: f.lng, lat: f.lat };
    }

    const createDemoOrders = async (itemsCount, village, serviceType, status, assignedShopId) => {
        const fInfo = createdFarmers[village] || createdFarmers["Rampura"];
        const orderIds = [];
        for (let i = 0; i < itemsCount; i++) {
            const order = await Order.create({
                farmer: fInfo.farmer._id,
                serviceType,
                products: [
                    {
                        name: serviceType === "Seeds" ? "Paddy Seeds (Hybrid)" : serviceType === "Fertilizer" ? "Urea Bag 50kg" : "Organic Bio-Pesticide",
                        quantity: (i + 1) * 25,
                        unit: "kg",
                    },
                ],
                location: {
                    type: "Point",
                    coordinates: [fInfo.lng + (i * 0.002), fInfo.lat + (i * 0.002)],
                },
                requestedDate: new Date(Date.now() + 86400000),
                transcript: `${serviceType} order for ${village} field cluster`,
                status: status || ORDER_STATUS.GROUPED,
                assignedShop: assignedShopId || null,
                isDemo: true,
                demoSessionId: null,
            });
            orderIds.push(order._id);
        }
        return orderIds;
    };

    // 5. Seed Demo TripBlocks (Canonical lifecycle only: CREATED, CLAIMED, COMPLETED)
    // Trip 1: CREATED Available Trip in Rampura (Trip #245)
    const trip1Orders = await createDemoOrders(6, "Rampura", "Seeds", ORDER_STATUS.GROUPED, null);
    const trip1 = await TripBlock.create({
        orders: trip1Orders,
        serviceType: "Seeds",
        assignedShop: null,
        scheduledDate: new Date(Date.now() + 86400000),
        status: TRIP_STATUS.CREATED,
        estimatedEarnings: 850,
        centerLocation: { type: "Point", coordinates: [77.4080, 23.2580] },
        isDemo: true,
        demoSessionId: null,
    });
    await Order.updateMany({ _id: { $in: trip1Orders } }, { tripBlock: trip1._id });

    // Trip 2: CREATED Available Trip in Bilkisganj (Trip #248)
    const trip2Orders = await createDemoOrders(4, "Bilkisganj", "Fertilizer", ORDER_STATUS.GROUPED, null);
    const trip2 = await TripBlock.create({
        orders: trip2Orders,
        serviceType: "Fertilizer",
        assignedShop: null,
        scheduledDate: new Date(Date.now() + 90000000),
        status: TRIP_STATUS.CREATED,
        estimatedEarnings: 620,
        centerLocation: { type: "Point", coordinates: [77.3820, 23.2180] },
        isDemo: true,
        demoSessionId: null,
    });
    await Order.updateMany({ _id: { $in: trip2Orders } }, { tripBlock: trip2._id });

    // Trip 3: CREATED Available Trip in Berasia Corridor (Trip #252)
    const trip3Orders = await createDemoOrders(8, "Berasia Corridor", "Pesticides", ORDER_STATUS.GROUPED, null);
    const trip3 = await TripBlock.create({
        orders: trip3Orders,
        serviceType: "Pesticides",
        assignedShop: null,
        scheduledDate: new Date(Date.now() + 100000000),
        status: TRIP_STATUS.CREATED,
        estimatedEarnings: 1200,
        centerLocation: { type: "Point", coordinates: [77.4560, 23.3220] },
        isDemo: true,
        demoSessionId: null,
    });
    await Order.updateMany({ _id: { $in: trip3Orders } }, { tripBlock: trip3._id });

    // Trip 4: CLAIMED / Active Trip assigned to Demo Shop (Trip #239)
    const trip4Orders = await createDemoOrders(5, "Kolar Hub", "Seeds", ORDER_STATUS.CLAIMED, shop._id);
    const trip4 = await TripBlock.create({
        orders: trip4Orders,
        serviceType: "Seeds",
        assignedShop: shop._id,
        scheduledDate: new Date(Date.now() + 40000000),
        status: TRIP_STATUS.CLAIMED,
        claimedAt: new Date(Date.now() - 3600000),
        estimatedEarnings: 740,
        centerLocation: { type: "Point", coordinates: [77.4110, 23.2420] },
        isDemo: true,
        demoSessionId: null,
    });
    await Order.updateMany({ _id: { $in: trip4Orders } }, { tripBlock: trip4._id });

    // Trip 5: COMPLETED Trip assigned to Demo Shop (Trip #220)
    const trip5Orders = await createDemoOrders(5, "Sehore East", "Fertilizer", ORDER_STATUS.COMPLETED, shop._id);
    const trip5 = await TripBlock.create({
        orders: trip5Orders,
        serviceType: "Fertilizer",
        assignedShop: shop._id,
        scheduledDate: new Date(Date.now() - 86400000),
        status: TRIP_STATUS.COMPLETED,
        claimedAt: new Date(Date.now() - 90000000),
        completedAt: new Date(Date.now() - 86400000),
        estimatedEarnings: 890,
        centerLocation: { type: "Point", coordinates: [77.3500, 23.2000] },
        isDemo: true,
        demoSessionId: null,
    });
    await Order.updateMany({ _id: { $in: trip5Orders } }, { tripBlock: trip5._id });

    // Trip 6: COMPLETED Trip assigned to Demo Shop (Trip #214)
    const trip6Orders = await createDemoOrders(4, "Phanda Hub", "Seeds", ORDER_STATUS.COMPLETED, shop._id);
    const trip6 = await TripBlock.create({
        orders: trip6Orders,
        serviceType: "Seeds",
        assignedShop: shop._id,
        scheduledDate: new Date(Date.now() - 172800000),
        status: TRIP_STATUS.COMPLETED,
        claimedAt: new Date(Date.now() - 176400000),
        completedAt: new Date(Date.now() - 172800000),
        estimatedEarnings: 580,
        centerLocation: { type: "Point", coordinates: [77.4420, 23.2750] },
        isDemo: true,
        demoSessionId: null,
    });
    await Order.updateMany({ _id: { $in: trip6Orders } }, { tripBlock: trip6._id });

    // 6. Seed Demo Notifications
    const notifications = [
        {
            user: user._id,
            title: "New TripBlock Available",
            message: "TripBlock in Rampura corridor is open for claiming (6 orders · ₹850 estimated earnings).",
            type: "TripBlock",
            channel: "IN_APP",
            deliveryStatus: "SENT",
            isRead: false,
            isDemo: true,
            isDemoNotification: true,
            metadata: { tripId: trip1._id, corridor: "Rampura", earnings: 850, isDemoNotification: true },
        },
        {
            user: user._id,
            title: "Trip Claim Confirmed",
            message: "TripBlock in Kolar Hub has been successfully locked and assigned to your shop.",
            type: "TripBlock",
            channel: "IN_APP",
            deliveryStatus: "SENT",
            isRead: true,
            isDemo: true,
            isDemoNotification: true,
            metadata: { tripId: trip4._id, corridor: "Kolar Hub", earnings: 740, isDemoNotification: true },
        },
        {
            user: user._id,
            title: "Payout Credited",
            message: "₹890 payout for completed delivery in Sehore East has been cleared.",
            type: "System",
            channel: "SYSTEM",
            deliveryStatus: "SENT",
            isRead: true,
            isDemo: true,
            isDemoNotification: true,
            metadata: { tripId: trip5._id, earnings: 890, isDemoNotification: true },
        },
        {
            user: user._id,
            title: "Payout Credited",
            message: "₹580 payout for completed delivery in Phanda Hub has been cleared.",
            type: "System",
            channel: "SYSTEM",
            deliveryStatus: "SENT",
            isRead: true,
            isDemo: true,
            isDemoNotification: true,
            metadata: { tripId: trip6._id, earnings: 580, isDemoNotification: true },
        },
    ];
    await Notification.insertMany(notifications);

    return {
        user,
        shop,
        trips: [trip1, trip2, trip3, trip4, trip5, trip6],
    };
};

module.exports = {
    CORRIDORS,
    DEMO_SHOP_PERSONAS,
    FARMER_PROFILES,
    ensureDemoShops,
    ensureFarmersForSession,
    seedLogisticsScenario,
    resetSessionData,
    resetGlobalDemoData,
    getDemoDataSummary,
    seedShopkeeperPortalDemo,
};
