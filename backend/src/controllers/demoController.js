/**
 * demoController.js — FarmLink Module 13: Demo Simulation Layer
 *
 * Design principles:
 *  - Per-visitor session isolation via a sessionId (UUID)
 *  - All demo data tagged isDemo:true + demoSessionId for safe cleanup
 *  - Dedicated demo shop/user (isDemo:true), NOT a real partner shop
 *  - Uses existing DB models directly — no modifications to existing services
 *  - Emits both eventBus events (existing pipeline) and demo:* socket events
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const User = require("../models/User");
const eventBus = require("../events/eventBus");

// ── Socket.IO instance (injected from socketEvents setup) ──────────
let _io = null;
const setIo = (io) => { _io = io; };

// ── Demo infrastructure (created once, persistent across sessions) ─
let _demoShopId = null;
const DEMO_SHOP_NAME = "FarmLink Demo Store";
const DEMO_SHOP_VILLAGE = "Demo Hub";
const DEMO_SHOP_PHONE = "+910000000000";
const DEMO_SHOP_COORDS = [77.4200, 23.2650]; // [lng, lat] — near seed data area
const DEMO_USER_EMAIL = "demo-shop@farmlink-demo.internal";

/**
 * Creates (or finds) the dedicated demo shop and its owner User.
 * Both are tagged isDemo:true and are never returned by the coordinator map.
 * Called lazily on first runStep to ensure DB is connected.
 */
const initDemoInfrastructure = async () => {
    if (_demoShopId) return _demoShopId;

    // Re-check DB in case server restarted
    let demoShop = await Shop.findOne({ isDemo: true });
    if (demoShop) {
        _demoShopId = demoShop._id;
        return _demoShopId;
    }

    // Create demo user (owner of the demo shop)
    let demoUser = await User.findOne({ email: DEMO_USER_EMAIL });
    if (!demoUser) {
        demoUser = await User.create({
            name: "FarmLink Demo",
            email: DEMO_USER_EMAIL,
            password: `DemoP@ss_${crypto.randomBytes(8).toString("hex")}`, // random, never used for real login
            role: "shopkeeper",
            isDemo: true,
        });
    }

    // Create demo shop
    demoShop = await Shop.create({
        shopName: DEMO_SHOP_NAME,
        owner: demoUser._id,
        category: ["Seeds", "Fertilizer", "Pesticides"],
        phone: DEMO_SHOP_PHONE,
        village: DEMO_SHOP_VILLAGE,
        location: {
            type: "Point",
            coordinates: DEMO_SHOP_COORDS,
        },
        isDemo: true,
    });

    _demoShopId = demoShop._id;
    console.log("[Demo] Demo infrastructure initialised. Shop ID:", _demoShopId);
    return _demoShopId;
};

// ── Per-session state ──────────────────────────────────────────────
const STAGES = [
    "IDLE",
    "FARMER_1_SUBMITTED",
    "FARMER_2_SUBMITTED",
    "FARMER_3_SUBMITTED",
    "TRIPBLOCK_CREATED",
    "SHOP_CLAIMED",
    "DELIVERY_COMPLETED",
];

/**
 * In-memory session store keyed by sessionId.
 * Each visitor gets their own isolated state.
 * Sessions older than 4 h are pruned periodically.
 */
const demoSessions = new Map();

// Prune stale sessions every 30 minutes
setInterval(() => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [id, s] of demoSessions) {
        if (s.createdAt < cutoff) demoSessions.delete(id);
    }
}, 30 * 60 * 1000);

const getSession = (sessionId) => {
    if (!demoSessions.has(sessionId)) {
        demoSessions.set(sessionId, {
            sessionId,
            stage: "IDLE",
            stageIndex: 0,
            orders: [], // [{ id, farmerName, village, products }]
            tripBlockId: null,
            createdAt: Date.now(),
        });
    }
    return demoSessions.get(sessionId);
};

// ── Scripted farmer personas (hardcoded for narrative richness) ────
const DEMO_FARMERS = [
    {
        name: "Ramesh Kumar",
        village: "Kolar Hub",
        coordinates: [77.4180, 23.2630], // [lng, lat]
        products: [{ name: "Paddy Seeds", quantity: 50, unit: "kg" }],
        transcript: "50 kilo paddy beej chahiye, 2 din mein ghar pe pahunchana",
        language: "Hindi",
    },
    {
        name: "Sunita Devi",
        village: "Bhopal Central",
        coordinates: [77.4220, 23.2660],
        products: [{ name: "Wheat Seeds", quantity: 30, unit: "kg" }],
        transcript: "30 kg gehu ke beej chahiye, jaldi delivery chahiye",
        language: "Hinglish",
    },
    {
        name: "Anil Patel",
        village: "Hoshangabad Road",
        coordinates: [77.4255, 23.2640],
        products: [{ name: "Hybrid Maize Seeds", quantity: 20, unit: "kg" }],
        transcript: "20 kg hybrid makka ke beej chahiye",
        language: "Hindi",
    },
];

const DEMO_SERVICE_TYPE = "Seeds";

// ── Helpers ────────────────────────────────────────────────────────
const calcCenter = (coordsArray) => {
    const total = coordsArray.reduce(
        (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
        { lng: 0, lat: 0 }
    );
    return {
        type: "Point",
        coordinates: [total.lng / coordsArray.length, total.lat / coordsArray.length],
    };
};

const shortId = (mongoId) =>
    `${mongoId.toString().slice(-4).toUpperCase()}`;

// ── API Handlers ───────────────────────────────────────────────────

/**
 * GET /api/demo/token?sessionId=<uuid>
 * Issues a demo JWT for socket authentication.
 * If no sessionId is supplied, generates a fresh one.
 */
const getToken = async (req, res) => {
    try {
        const sessionId = req.query.sessionId || crypto.randomUUID();
        const token = jwt.sign(
            { role: "demo", demo: true, sessionId },
            process.env.JWT_SECRET,
            { expiresIn: "4h" }
        );
        return res.json({ success: true, token, sessionId });
    } catch (err) {
        console.error("[Demo] getToken error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/demo/status?sessionId=<uuid>
 * Returns the current stage for a visitor session.
 */
const getStatus = async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: "sessionId is required" });
        }
        const session = getSession(sessionId);
        return res.json({
            success: true,
            stage: session.stage,
            stageIndex: session.stageIndex,
            totalStages: STAGES.length - 1,
            orderCount: session.orders.length,
            tripBlockId: session.tripBlockId,
            isComplete: session.stage === "DELIVERY_COMPLETED",
        });
    } catch (err) {
        console.error("[Demo] getStatus error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/demo/step  { sessionId }
 * Advances the demo by one stage. Idempotent if already completed.
 * Each stage creates real DB records tagged isDemo:true.
 */
const runStep = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: "sessionId is required" });
        }

        const session = getSession(sessionId);

        if (session.stage === "DELIVERY_COMPLETED") {
            return res.json({
                success: true,
                stage: session.stage,
                stageIndex: session.stageIndex,
                message: "Demo complete. Reset to replay.",
            });
        }

        // Ensure demo shop exists before any step
        await initDemoInfrastructure();

        let payload = {};

        // ── Stage 1: IDLE → FARMER_1_SUBMITTED ──────────────────────
        if (session.stage === "IDLE") {
            const fd = DEMO_FARMERS[0];
            const farmer = await Farmer.create({
                name: fd.name,
                whatsappNumber: `demo_${sessionId.slice(0, 8)}_1`,
                language: fd.language,
                isDemo: true,
                demoSessionId: sessionId,
            });
            const order = await Order.create({
                farmer: farmer._id,
                serviceType: DEMO_SERVICE_TYPE,
                products: fd.products,
                location: { type: "Point", coordinates: fd.coordinates },
                requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                transcript: fd.transcript,
                audioUrl: null,
                status: "Pending",
                isDemo: true,
                demoSessionId: sessionId,
            });

            session.orders.push({
                id: order._id,
                farmerName: fd.name,
                village: fd.village,
                products: fd.products,
            });
            session.stage = "FARMER_1_SUBMITTED";
            session.stageIndex = 1;

            payload = {
                eventId: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
                farmerName: fd.name,
                village: fd.village,
                products: fd.products,
                orderCode: `FL-ORD-${shortId(order._id)}`,
                orderNumber: 1,
                sessionId,
            };
            if (_io) _io.to(`demo:${sessionId}`).emit("demo:order_submitted", payload);

        // ── Stage 2: FARMER_1_SUBMITTED → FARMER_2_SUBMITTED ────────
        } else if (session.stage === "FARMER_1_SUBMITTED") {
            const fd = DEMO_FARMERS[1];
            const farmer = await Farmer.create({
                name: fd.name,
                whatsappNumber: `demo_${sessionId.slice(0, 8)}_2`,
                language: fd.language,
                isDemo: true,
                demoSessionId: sessionId,
            });
            const order = await Order.create({
                farmer: farmer._id,
                serviceType: DEMO_SERVICE_TYPE,
                products: fd.products,
                location: { type: "Point", coordinates: fd.coordinates },
                requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                transcript: fd.transcript,
                audioUrl: null,
                status: "Pending",
                isDemo: true,
                demoSessionId: sessionId,
            });

            session.orders.push({
                id: order._id,
                farmerName: fd.name,
                village: fd.village,
                products: fd.products,
            });
            session.stage = "FARMER_2_SUBMITTED";
            session.stageIndex = 2;

            payload = {
                eventId: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
                farmerName: fd.name,
                village: fd.village,
                products: fd.products,
                orderCode: `FL-ORD-${shortId(order._id)}`,
                orderNumber: 2,
                sessionId,
            };
            if (_io) _io.to(`demo:${sessionId}`).emit("demo:order_submitted", payload);

        // ── Stage 3: FARMER_2_SUBMITTED → FARMER_3_SUBMITTED ────────
        } else if (session.stage === "FARMER_2_SUBMITTED") {
            const fd = DEMO_FARMERS[2];
            const farmer = await Farmer.create({
                name: fd.name,
                whatsappNumber: `demo_${sessionId.slice(0, 8)}_3`,
                language: fd.language,
                isDemo: true,
                demoSessionId: sessionId,
            });
            const order = await Order.create({
                farmer: farmer._id,
                serviceType: DEMO_SERVICE_TYPE,
                products: fd.products,
                location: { type: "Point", coordinates: fd.coordinates },
                requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                transcript: fd.transcript,
                audioUrl: null,
                status: "Pending",
                isDemo: true,
                demoSessionId: sessionId,
            });

            session.orders.push({
                id: order._id,
                farmerName: fd.name,
                village: fd.village,
                products: fd.products,
            });
            session.stage = "FARMER_3_SUBMITTED";
            session.stageIndex = 3;

            payload = {
                eventId: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
                farmerName: fd.name,
                village: fd.village,
                products: fd.products,
                orderCode: `FL-ORD-${shortId(order._id)}`,
                orderNumber: 3,
                sessionId,
            };
            if (_io) _io.to(`demo:${sessionId}`).emit("demo:order_submitted", payload);

        // ── Stage 4: FARMER_3_SUBMITTED → TRIPBLOCK_CREATED ─────────
        } else if (session.stage === "FARMER_3_SUBMITTED") {
            const orderIds = session.orders.map((o) => o.id);
            const centerLocation = calcCenter(DEMO_FARMERS.map((f) => f.coordinates));

            // Create TripBlock directly (scoped to demo orders only — no risk of grouping real orders)
            const tripBlock = await TripBlock.create({
                orders: orderIds,
                serviceType: DEMO_SERVICE_TYPE,
                scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                centerLocation,
                status: "OPEN",
                estimatedEarnings: 1500,
                isDemo: true,
                demoSessionId: sessionId,
            });

            // Update all demo orders to Grouped
            await Order.updateMany(
                { _id: { $in: orderIds } },
                { $set: { status: "Grouped", tripBlock: tripBlock._id } }
            );

            session.tripBlockId = tripBlock._id;
            session.stage = "TRIPBLOCK_CREATED";
            session.stageIndex = 4;

            // Fire existing eventBus event (reaches admin room if coordinator is connected)
            eventBus.emit("trip_created", { tripBlock, shopIds: [_demoShopId] });

            payload = {
                eventId: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
                tripCode: `TB-${shortId(tripBlock._id)}`,
                orderCount: orderIds.length,
                serviceType: DEMO_SERVICE_TYPE,
                sessionId,
            };
            if (_io) _io.to(`demo:${sessionId}`).emit("demo:tripblock_created", payload);

        // ── Stage 5: TRIPBLOCK_CREATED → SHOP_CLAIMED ───────────────
        } else if (session.stage === "TRIPBLOCK_CREATED") {
            // Claim with the dedicated demo shop — no real shop or auth bypassed
            const tripBlock = await TripBlock.findOneAndUpdate(
                { _id: session.tripBlockId, status: "OPEN", isDemo: true },
                { status: "CLAIMED", assignedShop: _demoShopId, claimedAt: new Date() },
                { new: true }
            );

            if (!tripBlock) {
                throw new Error("Demo TripBlock not available for claiming (may already be claimed)");
            }

            // Update demo orders to Accepted
            await Order.updateMany(
                { _id: { $in: tripBlock.orders }, isDemo: true },
                { $set: { status: "Accepted", assignedShop: _demoShopId } }
            );

            // Fire existing eventBus event
            eventBus.emit("trip_claimed", { tripId: tripBlock._id, shopId: _demoShopId });

            session.stage = "SHOP_CLAIMED";
            session.stageIndex = 5;

            payload = {
                eventId: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
                tripCode: `TB-${shortId(tripBlock._id)}`,
                shopName: DEMO_SHOP_NAME,
                sessionId,
            };
            if (_io) _io.to(`demo:${sessionId}`).emit("demo:trip_claimed", payload);

        // ── Stage 6: SHOP_CLAIMED → DELIVERY_COMPLETED ──────────────
        } else if (session.stage === "SHOP_CLAIMED") {
            const tripBlock = await TripBlock.findOneAndUpdate(
                { _id: session.tripBlockId, status: "CLAIMED", assignedShop: _demoShopId, isDemo: true },
                { status: "COMPLETED", completedAt: new Date() },
                { new: true }
            );

            if (!tripBlock) {
                throw new Error("Demo TripBlock not available for completion");
            }

            // Update demo orders to Completed
            await Order.updateMany(
                { _id: { $in: tripBlock.orders }, isDemo: true },
                { $set: { status: "Completed" } }
            );

            // Fire existing eventBus event
            eventBus.emit("trip_completed", { tripId: tripBlock._id, shopId: _demoShopId });

            session.stage = "DELIVERY_COMPLETED";
            session.stageIndex = 6;

            payload = {
                eventId: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
                tripCode: `TB-${shortId(tripBlock._id)}`,
                shopName: DEMO_SHOP_NAME,
                orderCount: session.orders.length,
                serviceType: DEMO_SERVICE_TYPE,
                farmerNames: session.orders.map((o) => o.farmerName),
                sessionId,
            };
            if (_io) _io.to(`demo:${sessionId}`).emit("demo:trip_completed", payload);
        }

        return res.json({
            success: true,
            stage: session.stage,
            stageIndex: session.stageIndex,
            totalStages: STAGES.length - 1,
            ...payload,
        });

    } catch (err) {
        console.error("[Demo] runStep error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /api/demo/reset  (body or query: sessionId)
 * Deletes all DB records tagged with this sessionId and resets session state.
 * ONLY removes isDemo:true + demoSessionId documents — real data is never touched.
 */
const reset = async (req, res) => {
    try {
        const sessionId = (req.body && req.body.sessionId) || req.query.sessionId;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: "sessionId is required" });
        }

        const filter = { isDemo: true, demoSessionId: sessionId };

        const [deletedOrders, deletedFarmers, deletedTrips] = await Promise.all([
            Order.deleteMany(filter),
            Farmer.deleteMany(filter),
            TripBlock.deleteMany(filter),
        ]);

        // Reset in-memory session state (keep entry to allow restart)
        demoSessions.delete(sessionId);

        return res.json({
            success: true,
            message: "Demo session reset.",
            deleted: {
                orders: deletedOrders.deletedCount,
                farmers: deletedFarmers.deletedCount,
                tripBlocks: deletedTrips.deletedCount,
            },
        });
    } catch (err) {
        console.error("[Demo] reset error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/demo/map?sessionId=<uuid>
 * Returns map data in the EXACT same shape as /api/map/data so FarmLinkMap
 * can be used directly in the demo page without modification.
 * Only includes isDemo:true docs for this session.
 */
const getMapData = async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: "sessionId is required" });
        }

        const sessionFilter = { isDemo: true, demoSessionId: sessionId };

        // Fetch demo orders
        const rawOrders = await Order.find(sessionFilter)
            .populate("farmer", "name whatsappNumber language")
            .lean();

        const isValidCoords = (coords) =>
            Array.isArray(coords) &&
            coords.length >= 2 &&
            typeof coords[0] === "number" &&
            typeof coords[1] === "number" &&
            isFinite(coords[0]) &&
            isFinite(coords[1]);

        const orders = rawOrders
            .filter((o) => o.location && isValidCoords(o.location.coordinates))
            .map((order) => {
                const [lng, lat] = order.location.coordinates;
                return {
                    id: order._id,
                    code: `FL-ORD-${shortId(order._id)}`,
                    serviceType: order.serviceType,
                    products: order.products || [],
                    status: order.status,
                    requestedDate: order.requestedDate,
                    transcript: order.transcript || "",
                    audioUrl: order.audioUrl,
                    tripBlockId: order.tripBlock,
                    farmer: order.farmer
                        ? {
                              id: order.farmer._id,
                              name: order.farmer.name || "Demo Farmer",
                              phone: order.farmer.whatsappNumber,
                              language: order.farmer.language || "Hindi",
                          }
                        : null,
                    assignedShop: null,
                    coordinates: [lat, lng], // Leaflet [lat, lng]
                    rawCoordinates: [lng, lat],
                    type: "order",
                };
            });

        // Fetch demo TripBlocks
        const rawTrips = await TripBlock.find(sessionFilter)
            .populate({
                path: "orders",
                select: "products serviceType location status farmer",
                populate: { path: "farmer", select: "name" },
            })
            .lean();

        const tripBlocks = rawTrips
            .filter((t) => t.centerLocation && isValidCoords(t.centerLocation.coordinates))
            .map((trip) => {
                const [cLng, cLat] = trip.centerLocation.coordinates;
                const orderPoints = [];
                const populatedOrders = [];
                let totalQuantity = 0;

                if (Array.isArray(trip.orders)) {
                    trip.orders.forEach((o) => {
                        if (o && typeof o === "object") {
                            if (o.location && isValidCoords(o.location.coordinates)) {
                                orderPoints.push([
                                    o.location.coordinates[1],
                                    o.location.coordinates[0],
                                ]);
                            }
                            if (Array.isArray(o.products)) {
                                o.products.forEach((p) => {
                                    totalQuantity += p.quantity || 1;
                                });
                            }
                            if (o._id) {
                                populatedOrders.push({
                                    id: o._id,
                                    code: `FL-ORD-${shortId(o._id)}`,
                                    products: o.products || [],
                                    serviceType: o.serviceType,
                                    status: o.status,
                                    coordinates:
                                        o.location && isValidCoords(o.location.coordinates)
                                            ? [o.location.coordinates[1], o.location.coordinates[0]]
                                            : null,
                                });
                            }
                        }
                    });
                }

                // Destination point: demo shop coords
                const destPoint = trip.assignedShop
                    ? [DEMO_SHOP_COORDS[1], DEMO_SHOP_COORDS[0]] // [lat, lng] for Leaflet
                    : null;

                return {
                    id: trip._id,
                    code: `TB-${shortId(trip._id)}`,
                    serviceType: trip.serviceType,
                    status: trip.status,
                    scheduledDate: trip.scheduledDate,
                    estimatedEarnings: trip.estimatedEarnings || 0,
                    completedAt: trip.completedAt,
                    claimedAt: trip.claimedAt,
                    centerCoordinates: [cLat, cLng], // Leaflet [lat, lng]
                    rawCenterCoordinates: [cLng, cLat],
                    orderCount: populatedOrders.length,
                    totalQuantity,
                    orders: populatedOrders,
                    assignedShop: trip.assignedShop
                        ? {
                              id: trip.assignedShop,
                              name: DEMO_SHOP_NAME,
                              village: DEMO_SHOP_VILLAGE,
                              coordinates: destPoint,
                          }
                        : null,
                    corridor: {
                        originPoints: orderPoints,
                        centerPoint: [cLat, cLng],
                        destinationPoint: destPoint,
                    },
                    type: "tripblock",
                };
            });

        // Always include the demo shop so visitors can see it on the map
        const shops = _demoShopId
            ? [
                  {
                      id: _demoShopId,
                      name: DEMO_SHOP_NAME,
                      category: ["Seeds", "Fertilizer", "Pesticides"],
                      phone: DEMO_SHOP_PHONE,
                      village: DEMO_SHOP_VILLAGE,
                      coordinates: [DEMO_SHOP_COORDS[1], DEMO_SHOP_COORDS[0]], // Leaflet [lat, lng]
                      rawCoordinates: DEMO_SHOP_COORDS,
                      owner: null,
                      type: "shop",
                  },
              ]
            : [];

        return res.json({
            success: true,
            data: {
                shops,
                orders,
                tripBlocks,
                stats: {
                    totalShops: shops.length,
                    totalOrders: orders.length,
                    pendingOrders: orders.filter((o) => o.status === "Pending").length,
                    groupedOrders: orders.filter((o) => o.status === "Grouped").length,
                    openTripBlocks: tripBlocks.filter((t) => t.status === "OPEN").length,
                    claimedTripBlocks: tripBlocks.filter((t) => t.status === "CLAIMED").length,
                    completedTripBlocks: tripBlocks.filter((t) => t.status === "COMPLETED").length,
                },
            },
        });
    } catch (err) {
        console.error("[Demo] getMapData error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { setIo, getToken, getStatus, runStep, reset, getMapData };
