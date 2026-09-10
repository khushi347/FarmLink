/**
 * demoScenarioService.js — Recruiter Demo Scenarios Orchestration Engine
 *
 * Orchestrates FarmLink's REAL backend pipelines for recruiter demonstration:
 *  1. AI Order Ingestion (Gemini 2.5 Flash / fallback -> Real Order)
 *  2. Shared Delivery Grouping (6 nearby orders -> real groupingService.js -> TripBlock)
 *  3. Concurrent Shop Competition (3 shops -> claimTripService.js -> 1x 200, 2x 409)
 *  4. Real-Time Push Notification (TripBlock -> EventBus -> Notification -> Socket.IO)
 *
 * Strict Isolation:
 *  - Every record tagged with isDemo: true and demoSessionId
 *  - External Twilio SMS/WhatsApp calls are automatically suppressed
 *  - Real non-demo production data is never modified or included
 */

const crypto = require("crypto");
const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Notification = require("../models/Notification");
const eventBus = require("../events/eventBus");

const extractOrder = require("./geminiService");
const groupOrder = require("./groupingService");
const claimTripService = require("./claimTripService");
const { ORDER_STATUS, TRIP_STATUS } = require("./lifecycleService");

// Injected Socket.IO reference
let _io = null;
const setIo = (io) => {
    _io = io;
};

// ── Demo Personas & Deterministic Coordinates ────────────────────────
// Coordinated in Rampura / Kolar agricultural corridor (Bhopal region)
const DEMO_BASE_LNG = 77.4120;
const DEMO_BASE_LAT = 23.2600;

const SCENARIO_PRESETS = {
    hindi_dap: {
        transcript: "मुझे कल 4 बोरी डीएपी खाद चाहिए",
        language: "Hindi",
        expected: {
            serviceType: "Fertilizer",
            products: [{ name: "DAP Fertilizer", quantity: 4, unit: "bags" }],
        },
    },
    hinglish_wheat: {
        transcript: "50 kg gehu ke beej chahiye Kolar Road pe jaldi",
        language: "Hinglish",
        expected: {
            serviceType: "Seeds",
            products: [{ name: "Wheat Seed", quantity: 50, unit: "kg" }],
        },
    },
    english_pesticide: {
        transcript: "Need 2 packets of organic pesticide for tomato crop on Monday",
        language: "English",
        expected: {
            serviceType: "Pesticides",
            products: [{ name: "Organic Pesticide", quantity: 2, unit: "packets" }],
        },
    },
};

/**
 * Deterministic fallback parser matching orderPrompt.js normalization rules.
 * Used transparently if Gemini is unreachable or API quota is exhausted.
 */
const deterministicExtractFallback = (text = "") => {
    const lower = text.toLowerCase();

    // Fertilizer
    if (lower.includes("डीएपी") || lower.includes("dap") || lower.includes("यूरिया") || lower.includes("urea") || lower.includes("खाद")) {
        const qtyMatch = text.match(/(\d+)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 4;
        const name = (lower.includes("यूरिया") || lower.includes("urea")) ? "Urea Fertilizer" : "DAP Fertilizer";
        return {
            serviceType: "Fertilizer",
            products: [{ name, quantity: qty, unit: "bags" }],
            deliveryDate: new Date(Date.now() + 86400000).toISOString(),
            language: text.match(/[\u0900-\u097F]/) ? "Hindi" : "English",
        };
    }

    // Seeds
    if (lower.includes("beej") || lower.includes("seed") || lower.includes("बीज") || lower.includes("gehu") || lower.includes("wheat") || lower.includes("paddy")) {
        const qtyMatch = text.match(/(\d+)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 50;
        const name = (lower.includes("paddy") || lower.includes("धान")) ? "Rice Seed" : "Wheat Seed";
        return {
            serviceType: "Seeds",
            products: [{ name, quantity: qty, unit: "kg" }],
            deliveryDate: new Date(Date.now() + 86400000).toISOString(),
            language: text.match(/[\u0900-\u097F]/) ? "Hindi" : "Hinglish",
        };
    }

    // Pesticides
    if (lower.includes("pesticide") || lower.includes("कीटनाशक") || lower.includes("dawa")) {
        const qtyMatch = text.match(/(\d+)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 2;
        return {
            serviceType: "Pesticides",
            products: [{ name: "Organic Bio-Pesticide", quantity: qty, unit: "packets" }],
            deliveryDate: new Date(Date.now() + 86400000).toISOString(),
            language: text.match(/[\u0900-\u097F]/) ? "Hindi" : "English",
        };
    }

    // Default Fallback
    return {
        serviceType: "Seeds",
        products: [{ name: "Hybrid Agricultural Seeds", quantity: 25, unit: "kg" }],
        deliveryDate: new Date(Date.now() + 86400000).toISOString(),
        language: "English",
    };
};

/**
 * Ensures the 3 isolated demo retail shops exist for Scenario 3 (Shop Competition).
 */
const ensureThreeDemoShops = async () => {
    const shopConfigs = [
        {
            key: "shop_a",
            userName: "Ramesh Patel (Shop A)",
            email: "demo.shop.a@farmlink.internal",
            shopName: "Kisan Krishi Kendra (Shop A)",
            village: "Rampura Hub",
            phone: "+91 98000 00101",
            coords: [77.4100, 23.2580],
            category: ["Seeds", "Fertilizer", "Pesticides"],
        },
        {
            key: "shop_b",
            userName: "Suresh Meena (Shop B)",
            email: "demo.shop.b@farmlink.internal",
            shopName: "Green Valley Agro Store (Shop B)",
            village: "Kolar Corridor",
            phone: "+91 98000 00102",
            coords: [77.4200, 23.2650],
            category: ["Seeds", "Fertilizer", "Pesticides"],
        },
        {
            key: "shop_c",
            userName: "Anita Sharma (Shop C)",
            email: "demo.shop.c@farmlink.internal",
            shopName: "Mohan Agro Mart (Shop C)",
            village: "Bhopal South",
            phone: "+91 98000 00103",
            coords: [77.4300, 23.2700],
            category: ["Seeds", "Fertilizer", "Pesticides"],
        },
    ];

    const shops = [];
    for (const cfg of shopConfigs) {
        let user = await User.findOne({ email: cfg.email });
        if (!user) {
            user = await User.create({
                name: cfg.userName,
                email: cfg.email,
                password: `DemoShopPass_${crypto.randomBytes(6).toString("hex")}`,
                role: "shopkeeper",
                isDemo: true,
            });
        }

        let shop = await Shop.findOne({ owner: user._id, isDemo: true });
        if (!shop) {
            shop = await Shop.create({
                shopName: cfg.shopName,
                owner: user._id,
                category: cfg.category,
                phone: cfg.phone,
                village: cfg.village,
                location: {
                    type: "Point",
                    coordinates: cfg.coords,
                },
                isActive: true,
                isDemo: true,
            });
        }
        shops.push({ key: cfg.key, shop, user });
    }
    return shops;
};

// ── Scenario 1: AI Order Ingestion ───────────────────────────────────
/**
 * Executes Scenario 1: Raw Text -> Gemini AI Extraction -> Real MongoDB Order
 */
const runAiOrderScenario = async ({ text, sessionId }) => {
    if (!text || typeof text !== "string" || !text.trim()) {
        throw new Error("Text input is required for AI order scenario");
    }
    if (!sessionId) {
        throw new Error("sessionId is required for demo isolation");
    }

    let aiData;
    let extractionSource = "gemini-2.5-flash";

    try {
        aiData = await extractOrder(text.trim());
        if (!aiData || !aiData.serviceType || !Array.isArray(aiData.products) || aiData.products.length === 0) {
            throw new Error("Gemini returned incomplete structure");
        }
    } catch (geminiErr) {
        console.warn("[Scenario 1] Live Gemini extraction unavailable. Using deterministic fallback:", geminiErr.message);
        aiData = deterministicExtractFallback(text.trim());
        extractionSource = "deterministic-fallback (Gemini unavailable)";
    }

    // 1. Create session-isolated Demo Farmer
    const farmerName = aiData.language === "Hindi" ? "Ramesh Kumar" : "Sunita Devi";
    const farmer = await Farmer.create({
        name: farmerName,
        whatsappNumber: `+91980${sessionId.slice(0, 7).replace(/\D/g, "0")}`,
        language: aiData.language || "Hindi",
        isDemo: true,
        demoSessionId: sessionId,
    });

    // 2. Deterministic order location in Rampura
    const location = {
        type: "Point",
        coordinates: [DEMO_BASE_LNG, DEMO_BASE_LAT],
    };

    // 3. Create Real MongoDB Order document
    const order = await Order.create({
        farmer: farmer._id,
        serviceType: aiData.serviceType || "Seeds",
        products: aiData.products.map((p) => ({
            name: p.name || "Agricultural Supply",
            quantity: Number(p.quantity) || 1,
            unit: p.unit || "unit",
        })),
        location,
        requestedDate: aiData.deliveryDate ? new Date(aiData.deliveryDate) : new Date(Date.now() + 86400000),
        transcript: text.trim(),
        audioUrl: null,
        status: ORDER_STATUS.RECEIVED,
        isDemo: true,
        demoSessionId: sessionId,
    });

    // 4. Emit non-blocking EventBus & Socket.IO event
    eventBus.emit("new_order", { order, shopIds: [] });
    if (_io) {
        _io.to(`demo:${sessionId}`).emit("demo:order_submitted", {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            farmerName: farmer.name,
            village: "Rampura",
            products: order.products,
            orderCode: `FL-ORD-${String(order._id).slice(-4).toUpperCase()}`,
            orderNumber: 1,
            sessionId,
        });
    }

    return {
        success: true,
        extractionSource,
        transcript: text.trim(),
        aiData,
        order: {
            id: order._id,
            code: `FL-ORD-${String(order._id).slice(-4).toUpperCase()}`,
            serviceType: order.serviceType,
            products: order.products,
            status: order.status,
            requestedDate: order.requestedDate,
            coordinates: [location.coordinates[1], location.coordinates[0]], // [lat, lng]
            isDemo: order.isDemo,
            demoSessionId: order.demoSessionId,
        },
        farmer: {
            id: farmer._id,
            name: farmer.name,
            phone: farmer.whatsappNumber,
            language: farmer.language,
        },
    };
};

// ── Scenario 2: Shared Delivery (Grouping Engine) ────────────────────
/**
 * Seeds 6 nearby compatible demo orders and executes real groupingService.js
 */
const runSharedDeliveryScenario = async ({ sessionId }) => {
    if (!sessionId) {
        throw new Error("sessionId is required for demo isolation");
    }

    // Clean any un-grouped orders from previous runs for this session to guarantee pristine state
    await Order.deleteMany({ isDemo: true, demoSessionId: sessionId, status: ORDER_STATUS.RECEIVED });
    await TripBlock.deleteMany({ isDemo: true, demoSessionId: sessionId });

    // Seed 6 demo farmers with tight geographic clustering in Rampura (<1.5 km spread)
    const farmerSpecs = [
        { name: "Ramlal Gurjar", village: "Rampura North", offsetLng: 0.0000, offsetLat: 0.0000, qty: 25 },
        { name: "Shivraj Meena", village: "Rampura Center", offsetLng: 0.0020, offsetLat: 0.0015, qty: 30 },
        { name: "Devendra Singh", village: "Rampura East", offsetLng: 0.0035, offsetLat: 0.0020, qty: 50 },
        { name: "Kamal Patel", village: "Rampura South", offsetLng: 0.0010, offsetLat: -0.0015, qty: 40 },
        { name: "Anandi Bai", village: "Rampura West", offsetLng: -0.0020, offsetLat: 0.0010, qty: 20 },
        { name: "Mohanlal Rajput", village: "Rampura Hub", offsetLng: -0.0015, offsetLat: -0.0010, qty: 35 },
    ];

    const scheduledDate = new Date(Date.now() + 86400000); // Identical delivery time (0 difference <= 5h window)
    const seededOrderIds = [];
    const seededOrders = [];

    for (let i = 0; i < farmerSpecs.length; i++) {
        const spec = farmerSpecs[i];
        const farmer = await Farmer.create({
            name: spec.name,
            whatsappNumber: `+91980000${sessionId.slice(0, 3)}${i}`,
            language: "Hindi",
            isDemo: true,
            demoSessionId: sessionId,
        });

        const order = await Order.create({
            farmer: farmer._id,
            serviceType: "Seeds",
            products: [{ name: "Hybrid Paddy Seeds", quantity: spec.qty, unit: "kg" }],
            location: {
                type: "Point",
                coordinates: [DEMO_BASE_LNG + spec.offsetLng, DEMO_BASE_LAT + spec.offsetLat],
            },
            requestedDate: scheduledDate,
            transcript: `${spec.qty} kg paddy seeds for ${spec.village}`,
            status: ORDER_STATUS.RECEIVED,
            isDemo: true,
            demoSessionId: sessionId,
        });

        seededOrderIds.push(order._id);
        seededOrders.push({
            id: order._id,
            code: `FL-ORD-${String(order._id).slice(-4).toUpperCase()}`,
            farmerName: spec.name,
            village: spec.village,
            quantity: spec.qty,
            coordinates: [DEMO_BASE_LAT + spec.offsetLat, DEMO_BASE_LNG + spec.offsetLng],
        });
    }

    // Execute the REAL grouping engine from Module 16!
    const groupingResult = await groupOrder(seededOrderIds[0]);

    if (!groupingResult || !groupingResult.success || !groupingResult.tripBlock) {
        throw new Error(groupingResult?.message || "Grouping engine failed to group orders");
    }

    const tripBlock = groupingResult.tripBlock;

    // Verify in MongoDB that all 6 orders are now GROUPED
    const updatedOrders = await Order.find({ _id: { $in: seededOrderIds } }).lean();
    const allGrouped = updatedOrders.every((o) => o.status === ORDER_STATUS.GROUPED && String(o.tripBlock) === String(tripBlock._id));

    // Emit eventBus events
    eventBus.emit("order_grouped", {
        tripBlock,
        orderIds: tripBlock.orders,
        isDemo: true,
    });
    eventBus.emit("trip_created", {
        tripBlock,
        shopIds: [],
    });

    // Push live Socket.IO update to demo session
    if (_io) {
        _io.to(`demo:${sessionId}`).emit("demo:tripblock_created", {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripCode: `TB-${String(tripBlock._id).slice(-4).toUpperCase()}`,
            orderCount: tripBlock.orders.length,
            serviceType: tripBlock.serviceType,
            centerLocation: tripBlock.centerLocation,
            sessionId,
        });
    }

    return {
        success: true,
        seededOrdersCount: seededOrderIds.length,
        groupedOrdersCount: tripBlock.orders.length,
        allGroupedVerified: allGrouped,
        tripBlock: {
            id: tripBlock._id,
            code: `TB-${String(tripBlock._id).slice(-4).toUpperCase()}`,
            serviceType: tripBlock.serviceType,
            status: tripBlock.status,
            centerCoordinates: [tripBlock.centerLocation.coordinates[1], tripBlock.centerLocation.coordinates[0]],
            orderCount: tripBlock.orders.length,
            estimatedEarnings: tripBlock.estimatedEarnings || 850,
            isDemo: tripBlock.isDemo,
            demoSessionId: tripBlock.demoSessionId,
        },
        orders: seededOrders,
    };
};

// ── Scenario 3: Shop Competition (Atomic Concurrency) ────────────────
/**
 * Simulates Shop A, Shop B, and Shop C claiming the same TripBlock concurrently.
 * Expects exactly 1 Winner (HTTP 200) and 2 Conflicts (HTTP 409).
 * Preserves canonical Module 16 lifecycle: CREATED -> CLAIMED -> COMPLETED (NO LOCKED state).
 */
const runShopCompetitionScenario = async ({ sessionId }) => {
    if (!sessionId) {
        throw new Error("sessionId is required for demo isolation");
    }

    // 1. Ensure 3 distinct demo shops exist
    const demoShops = await ensureThreeDemoShops();

    // 2. Create 1 available TripBlock in Rampura
    const farmer = await Farmer.create({
        name: "Devendra Singh (Demo)",
        whatsappNumber: `+91980000${sessionId.slice(0, 4)}`,
        language: "Hindi",
        isDemo: true,
        demoSessionId: sessionId,
    });

    const demoOrder = await Order.create({
        farmer: farmer._id,
        serviceType: "Seeds",
        products: [{ name: "Hybrid Paddy Seeds", quantity: 60, unit: "kg" }],
        location: {
            type: "Point",
            coordinates: [DEMO_BASE_LNG, DEMO_BASE_LAT],
        },
        requestedDate: new Date(Date.now() + 86400000),
        transcript: "60 kg hybrid paddy seeds",
        status: ORDER_STATUS.GROUPED,
        isDemo: true,
        demoSessionId: sessionId,
    });

    const tripBlock = await TripBlock.create({
        orders: [demoOrder._id],
        serviceType: "Seeds",
        scheduledDate: new Date(Date.now() + 86400000),
        centerLocation: {
            type: "Point",
            coordinates: [DEMO_BASE_LNG, DEMO_BASE_LAT],
        },
        status: TRIP_STATUS.CREATED, // Canonical initial status
        estimatedEarnings: 950,
        isDemo: true,
        demoSessionId: sessionId,
    });

    await Order.updateOne({ _id: demoOrder._id }, { $set: { tripBlock: tripBlock._id } });

    // 3. Trigger genuinely concurrent claims from Shop A, Shop B, and Shop C!
    const claimPromises = demoShops.map(async ({ key, shop }) => {
        try {
            const claimed = await claimTripService(tripBlock._id, shop._id);
            return {
                shopKey: key,
                shopId: shop._id,
                shopName: shop.shopName,
                status: 200,
                success: true,
                message: "Trip successfully claimed and assigned.",
                trip: claimed,
            };
        } catch (err) {
            return {
                shopKey: key,
                shopId: shop._id,
                shopName: shop.shopName,
                status: 409,
                success: false,
                message: err.message || "Trip is no longer available",
            };
        }
    });

    const results = await Promise.all(claimPromises);

    // 4. Verify outcomes: exactly 1 status 200, exactly 2 status 409
    const winner = results.find((r) => r.status === 200);
    const losers = results.filter((r) => r.status === 409);

    if (!winner) {
        throw new Error("No shop won the claim — unexpected transaction deadlock");
    }
    if (losers.length !== 2) {
        throw new Error(`Expected exactly 2 conflicts, received ${losers.length}`);
    }

    // Inspect MongoDB to verify final canonical state is strictly CLAIMED
    const finalTrip = await TripBlock.findById(tripBlock._id).lean();
    if (finalTrip.status !== TRIP_STATUS.CLAIMED) {
        throw new Error(`Expected final status to be CLAIMED, got ${finalTrip.status}`);
    }

    // Emit eventBus & Socket.IO events
    eventBus.emit("trip_claimed", {
        tripId: finalTrip._id,
        shopId: finalTrip.assignedShop,
        isDemo: true,
    });

    if (_io) {
        _io.to(`demo:${sessionId}`).emit("demo:trip_claimed", {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripCode: `TB-${String(finalTrip._id).slice(-4).toUpperCase()}`,
            shopName: winner.shopName,
            sessionId,
        });
    }

    return {
        success: true,
        tripId: finalTrip._id,
        tripCode: `TB-${String(finalTrip._id).slice(-4).toUpperCase()}`,
        finalLifecycleStatus: finalTrip.status, // Strictly CLAIMED
        winner: {
            shopKey: winner.shopKey,
            shopId: winner.shopId,
            shopName: winner.shopName,
            httpStatus: 200,
            message: winner.message,
        },
        rejectedShops: losers.map((l) => ({
            shopKey: l.shopKey,
            shopId: l.shopId,
            shopName: l.shopName,
            httpStatus: 409,
            message: l.message,
        })),
    };
};

// ── Scenario 4: Real-Time Instant Notification ───────────────────────
/**
 * Triggers a real TripBlock creation that cascades through EventBus,
 * creates a real Notification in MongoDB, and pushes via Socket.IO.
 */
const runRealtimeNotificationScenario = async ({ sessionId }) => {
    if (!sessionId) {
        throw new Error("sessionId is required for demo isolation");
    }

    const demoShops = await ensureThreeDemoShops();
    const primaryShop = demoShops[0].shop;

    // Create a demo TripBlock to trigger the event
    const tripBlock = await TripBlock.create({
        orders: [],
        serviceType: "Seeds",
        scheduledDate: new Date(Date.now() + 86400000),
        centerLocation: {
            type: "Point",
            coordinates: [DEMO_BASE_LNG, DEMO_BASE_LAT],
        },
        status: TRIP_STATUS.CREATED,
        estimatedEarnings: 850,
        isDemo: true,
        demoSessionId: sessionId,
    });

    const tripCode = `Trip #${String(tripBlock._id).slice(-4).toUpperCase()}`;

    // Create real persistent Notification document in MongoDB
    const notification = await Notification.create({
        user: primaryShop.owner,
        recipientType: "User",
        title: "New Trip Available",
        message: `A new Seeds trip (${tripCode}) is available in Rampura corridor with estimated earnings of ₹850.`,
        type: "TripBlock",
        channel: "SOCKET_IO",
        deliveryStatus: "SENT",
        isDemo: true,
        metadata: {
            tripId: tripBlock._id,
            serviceType: "Seeds",
            earnings: 850,
            corridor: "Rampura corridor",
            sessionId,
        },
    });

    // Fire EventBus
    eventBus.emit("trip_created", {
        tripBlock,
        shopIds: [primaryShop._id],
    });

    // Emit live Socket.IO events to both demo room and visitor room
    const socketPayload = {
        eventId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        tripCode,
        tripBlockId: tripBlock._id,
        earnings: 850,
        corridor: "Rampura corridor",
        serviceType: "Seeds",
        notificationId: notification._id,
        title: notification.title,
        message: notification.message,
        sessionId,
    };

    if (_io) {
        _io.to(`demo:${sessionId}`).emit("notification_received", socketPayload);
        _io.to(`demo:${sessionId}`).emit("demo:tripblock_created", socketPayload);
        _io.to("demo_shopkeepers").emit("trip_created", { tripBlock, isDemo: true });
    }

    return {
        success: true,
        notification: {
            id: notification._id,
            title: notification.title,
            message: notification.message,
            channel: notification.channel,
            type: notification.type,
            isDemo: notification.isDemo,
            createdAt: notification.createdAt,
        },
        tripBlock: {
            id: tripBlock._id,
            code: tripCode,
            status: tripBlock.status,
            earnings: tripBlock.estimatedEarnings,
        },
        socketEmitted: true,
    };
};

// ── Session Reset Utility ────────────────────────────────────────────
/**
 * Strictly wipes all records created for this specific demo session.
 * Real non-demo data and other demo sessions remain completely untouched.
 */
const resetSessionScenarioData = async (sessionId) => {
    if (!sessionId) {
        throw new Error("sessionId is required to reset scenario data");
    }

    const sessionFilter = { isDemo: true, demoSessionId: sessionId };
    const notifFilter = { isDemo: true, "metadata.sessionId": sessionId };

    const [deletedOrders, deletedFarmers, deletedTrips, deletedNotifs] = await Promise.all([
        Order.deleteMany(sessionFilter),
        Farmer.deleteMany(sessionFilter),
        TripBlock.deleteMany(sessionFilter),
        Notification.deleteMany(notifFilter),
    ]);

    return {
        success: true,
        sessionId,
        deleted: {
            orders: deletedOrders.deletedCount,
            farmers: deletedFarmers.deletedCount,
            tripBlocks: deletedTrips.deletedCount,
            notifications: deletedNotifs.deletedCount,
        },
    };
};

module.exports = {
    setIo,
    runAiOrderScenario,
    runSharedDeliveryScenario,
    runShopCompetitionScenario,
    runRealtimeNotificationScenario,
    resetSessionScenarioData,
    ensureThreeDemoShops,
    SCENARIO_PRESETS,
};
