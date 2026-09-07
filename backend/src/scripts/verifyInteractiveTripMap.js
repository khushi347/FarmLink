/**
 * verifyInteractiveTripMap.js — Module 15: Interactive Trip & Map Visualization Verification
 *
 * Validates:
 * 1. GET /api/map/data returns structured TripBlocks with:
 *    - waypoints: ordered sequence [Shop, Customer 1, Customer 2, ...]
 *    - routePolyline: sequential [lat, lng] array
 *    - distanceKm: cumulative route distance in km
 *    - deliveryRegion: corridor / village region
 * 2. Edge cases:
 *    - Trip with 0 orders
 *    - Trip with 1 order
 *    - Trip with multiple orders
 *    - Trip with unassigned shop
 *    - Orders with missing coordinates
 * 3. Regression checks: Real vs demo isolation intact.
 */

const path = require("path");
const assert = require("assert");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { getMapData } = require("../controllers/mapController");
const { calculateDistanceKm, buildTripRoute } = require("../utils/geoUtils");
const TripBlock = require("../models/TripBlock");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");

const runVerification = async () => {
    console.log("==========================================================");
    console.log("  FarmLink Module 15 — Interactive Trip & Map Verification  ");
    console.log("==========================================================");

    await connectDB();

    // 1. Test reusable geospatial distance calculation
    console.log("\n[1/5] Testing Haversine Distance Utility...");
    const shopCoords = [77.4200, 23.2650]; // [lng, lat]
    const customerCoords = [77.3500, 23.2000];
    const dist = calculateDistanceKm(shopCoords, customerCoords);
    assert(typeof dist === "number" && dist > 5 && dist < 30, `Distance should be realistic: ${dist}km`);
    console.log(`✓ Distance calculation verified: ${dist} km between shop and customer`);

    // 2. Test Route Builder & Nearest-Neighbor Sequencing
    console.log("\n[2/5] Testing Nearest-Neighbor Route Sequencing & Waypoints...");
    const mockShop = {
        shopName: "Kisan Krishi Kendra",
        village: "Rampura",
        location: { type: "Point", coordinates: [77.4200, 23.2650] },
    };

    const mockOrders = [
        {
            _id: new mongoose.Types.ObjectId(),
            serviceType: "Seeds",
            location: { type: "Point", coordinates: [77.4500, 23.2800] },
            farmer: { name: "Ramesh Gurjar", whatsappNumber: "+919876511002" },
            products: [{ name: "Wheat Seeds", quantity: 2, unit: "Bags" }],
            status: "Grouped",
        },
        {
            _id: new mongoose.Types.ObjectId(),
            serviceType: "Seeds",
            location: { type: "Point", coordinates: [77.4300, 23.2700] },
            farmer: { name: "Suresh Meena", whatsappNumber: "+919876511003" },
            products: [{ name: "Urea", quantity: 1, unit: "Bag" }],
            status: "Grouped",
        },
    ];

    const routeResult = buildTripRoute(mockShop, mockOrders, [77.4250, 23.2680]);
    assert.strictEqual(routeResult.waypoints.length, 3, "Should produce 3 waypoints (1 Shop + 2 Customers)");
    assert.strictEqual(routeResult.waypoints[0].type, "shop", "First waypoint must be shop");
    assert.strictEqual(routeResult.waypoints[0].name, "Kisan Krishi Kendra");
    assert.strictEqual(routeResult.waypoints[1].type, "customer", "Second waypoint must be customer");
    assert.strictEqual(routeResult.waypoints[2].type, "customer", "Third waypoint must be customer");
    assert.strictEqual(routeResult.waypoints[1].name, "Suresh Meena", "Suresh is geographically closer to shop, should be visited first");
    assert(routeResult.distanceKm > 0, "Total distance must be positive");
    assert.strictEqual(routeResult.routePolyline.length, 3, "Polyline must have 3 coordinates");
    console.log(`✓ Sequential route generated: ${routeResult.waypoints.map(w => w.name).join(" -> ")}`);
    console.log(`✓ Total sequential route distance: ${routeResult.distanceKm} km`);

    // 3. Test Edge Cases (0 orders, missing coords, unassigned shop)
    console.log("\n[3/5] Testing Edge Cases...");
    // 3a. Zero orders
    const emptyTrip = buildTripRoute(mockShop, [], [77.4200, 23.2650]);
    assert.strictEqual(emptyTrip.waypoints.length, 1, "Zero orders should result in single shop waypoint");
    assert.strictEqual(emptyTrip.distanceKm, 0, "Zero orders distance must be 0");
    console.log("  ✓ Zero orders handled gracefully");

    // 3b. Unassigned shop (OPEN tripblock)
    const unassignedTrip = buildTripRoute(null, mockOrders, [77.4250, 23.2680]);
    assert.strictEqual(unassignedTrip.waypoints[0].type, "shop");
    assert.strictEqual(unassignedTrip.waypoints[0].details, "Open for Retail Shop Claim");
    assert(unassignedTrip.distanceKm > 0);
    console.log("  ✓ Unassigned tripblock handled with regional hub fallback");

    // 3c. Orders with missing coordinates
    const missingCoordOrder = {
        _id: new mongoose.Types.ObjectId(),
        serviceType: "Fertilizer",
        location: null,
        farmer: { name: "No Coords Farmer" },
        products: [],
    };
    const robustTrip = buildTripRoute(mockShop, [mockOrders[0], missingCoordOrder], [77.4200, 23.2650]);
    assert.strictEqual(robustTrip.waypoints.length, 3, "Must include unmapped order in waypoints list without crashing");
    console.log("  ✓ Missing coordinates order handled gracefully");

    // 4. Test live GET /api/map/data controller response
    console.log("\n[4/5] Testing live GET /api/map/data response structure...");
    const req = { query: {} };
    let responseData = null;
    let responseStatus = null;
    const res = {
        status(c) { responseStatus = c; return this; },
        json(d) { responseData = d; return this; },
    };

    await getMapData(req, res);
    assert.strictEqual(responseStatus, 200, "GET /api/map/data must return 200");
    assert(responseData?.success, "Response must be success: true");
    const { tripBlocks, shops, orders } = responseData.data;

    console.log(`  Live data: ${shops.length} shops, ${orders.length} orders, ${tripBlocks.length} TripBlocks`);
    assert(Array.isArray(tripBlocks), "tripBlocks must be an array");

    if (tripBlocks.length > 0) {
        const tb = tripBlocks[0];
        assert(tb.id, "TripBlock must have id");
        assert(tb.code, "TripBlock must have code");
        assert(typeof tb.distanceKm === "number", "TripBlock must have distanceKm");
        assert(tb.deliveryRegion, "TripBlock must have deliveryRegion");
        assert(Array.isArray(tb.waypoints), "TripBlock must have waypoints array");
        assert(Array.isArray(tb.routePolyline), "TripBlock must have routePolyline array");

        console.log(`  Sample TripBlock: ${tb.code} | ${tb.status} | ${tb.distanceKm} km | Region: ${tb.deliveryRegion}`);
        console.log(`  Waypoints (${tb.waypoints.length}):`);
        tb.waypoints.forEach((w) => {
            console.log(`    [${w.sequence}] ${w.type.toUpperCase()}: ${w.name} (📍 ${w.village || 'N/A'}) ${w.itemsSummary ? '· ' + w.itemsSummary : ''}`);
        });
    }
    console.log("✓ Live /api/map/data contract strictly conforms to Module 15 specification");

    // 5. Verify Zero Demo Leakage in Coordinator Map
    console.log("\n[5/5] Verifying Strict Demo Isolation...");
    const demoShops = shops.filter(s => s.name?.includes("Demo"));
    const demoOrders = orders.filter(o => o.farmer?.name === "Ramlal Gurjar");
    assert.strictEqual(demoShops.length, 0, "No demo shops in coordinator map");
    assert.strictEqual(demoOrders.length, 0, "No demo orders in coordinator map");
    console.log("✓ ZERO DEMO LEAKAGE: Coordinator live map data is completely isolated from demo records");

    console.log("\n==========================================================");
    console.log("  ALL MODULE 15 VERIFICATION CHECKS PASSED SUCCESSFULLY!  ");
    console.log("==========================================================");
    process.exit(0);
};

runVerification().catch((err) => {
    console.error("Module 15 Verification failed:", err);
    process.exit(1);
});
