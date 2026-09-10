/**
 * verifyDemoData.js — Verification Suite for Demo Data & Seed System (Module 21)
 *
 * Verifies 10 Core Criteria:
 * 1. Logistics scenario loads successfully.
 * 2. Expected dataset counts and relationships are correct (19 orders, 3 TripBlocks, 4 notifications, 4 corridors).
 * 3. Canonical lifecycle states strictly adhered to (Orders: RECEIVED, GROUPED, CLAIMED, COMPLETED; Trips: CREATED, CLAIMED, COMPLETED).
 * 4. Geographic distribution is realistic and grouping-compatible.
 * 5. Re-running reset + seed produces the same logical structure.
 * 6. Session reset cannot delete another session's records.
 * 7. Global reset cannot delete non-demo records.
 * 8. Production/non-demo data remains unchanged throughout all operations.
 * 9. Demo records remain excluded from production analytics and admin metrics.
 * 10. No external Twilio/WhatsApp notification is dispatched (isDemoNotification: true).
 */

const path = require("path");
const assert = require("assert");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Order = require("../models/Order");
const Farmer = require("../models/Farmer");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const Notification = require("../models/Notification");

const {
    CORRIDORS,
    seedLogisticsScenario,
    resetSessionData,
    resetGlobalDemoData,
    getDemoDataSummary,
    ensureDemoShops
} = require("../services/demoSeedService");

const { getPlatformAnalytics, getLogisticsAnalytics } = require("../services/analyticsService");
const { ORDER_STATUS, TRIP_STATUS } = require("../services/lifecycleService");

// Helper: Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const runVerification = async () => {
    console.log("===============================================================");
    console.log("  FarmLink — Demo Data & Seed System Verification Suite        ");
    console.log("===============================================================");

    await connectDB();

    const testSessionA = `test_demo_a_${Date.now()}`;
    const testSessionB = `test_demo_b_${Date.now()}`;

    // ─────────────────────────────────────────────────────────────────
    // BASELINE: Snapshot Non-Demo Counts
    // ─────────────────────────────────────────────────────────────────
    const initialNonDemoOrders = await Order.countDocuments({ isDemo: { $ne: true } });
    const initialNonDemoTrips = await TripBlock.countDocuments({ isDemo: { $ne: true } });
    const initialNonDemoFarmers = await Farmer.countDocuments({ isDemo: { $ne: true } });
    const initialNonDemoShops = await Shop.countDocuments({ isDemo: { $ne: true } });
    const initialNonDemoNotifs = await Notification.countDocuments({ isDemo: { $ne: true } });

    console.log(`\nBaseline Non-Demo Records:`);
    console.log(`  Orders: ${initialNonDemoOrders}, Trips: ${initialNonDemoTrips}, Farmers: ${initialNonDemoFarmers}, Shops: ${initialNonDemoShops}, Notifications: ${initialNonDemoNotifs}`);

    try {
        // ─────────────────────────────────────────────────────────────────
        // TEST 1: Logistics scenario loads successfully
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 1/10] Verifying logistics scenario load...");
        const seedResultA = await seedLogisticsScenario({ sessionId: testSessionA });
        assert(seedResultA.success === true, "Seed operation should return success: true");
        assert(seedResultA.counts.orders === 19, `Expected 19 seeded orders, got ${seedResultA.counts.orders}`);
        assert(seedResultA.counts.tripBlocks === 3, `Expected 3 seeded TripBlocks, got ${seedResultA.counts.tripBlocks}`);
        assert(seedResultA.counts.notifications === 4, `Expected 4 seeded notifications, got ${seedResultA.counts.notifications}`);
        console.log("  ✓ Logistics scenario loaded successfully with 19 orders, 3 TripBlocks, 4 notifications.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 2: Expected dataset counts and relationships are correct
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 2/10] Verifying dataset counts and referential relationships...");
        const summaryA = await getDemoDataSummary(testSessionA);
        assert.strictEqual(summaryA.orders.total, 19, "Summary orders total must be 19");
        assert.strictEqual(summaryA.tripBlocks.total, 3, "Summary tripBlocks total must be 3");
        assert.strictEqual(summaryA.notifications.total, 4, "Summary notifications total must be 4");

        // Verify relationships
        const dbOrdersA = await Order.find({ isDemo: true, demoSessionId: testSessionA })
            .populate("farmer")
            .populate("assignedShop")
            .populate("tripBlock");

        for (const ord of dbOrdersA) {
            assert(ord.farmer, `Order ${ord._id} must have a valid farmer reference`);
            assert(ord.products && ord.products.length > 0, `Order ${ord._id} must have products`);
            if (ord.status === ORDER_STATUS.GROUPED || ord.status === ORDER_STATUS.CLAIMED || ord.status === ORDER_STATUS.COMPLETED) {
                assert(ord.tripBlock, `Order ${ord._id} with status ${ord.status} must be linked to a TripBlock`);
            }
            if (ord.status === ORDER_STATUS.CLAIMED || ord.status === ORDER_STATUS.COMPLETED) {
                assert(ord.assignedShop, `Order ${ord._id} with status ${ord.status} must have an assignedShop`);
            }
        }

        const dbTripsA = await TripBlock.find({ isDemo: true, demoSessionId: testSessionA });
        for (const trip of dbTripsA) {
            assert(trip.orders && trip.orders.length > 0, `Trip ${trip._id} must link to orders`);
            assert(trip.centerLocation && trip.centerLocation.coordinates.length === 2, `Trip ${trip._id} must have centerLocation coordinates`);
            assert(trip.estimatedEarnings > 0, `Trip ${trip._id} estimatedEarnings must be > 0`);
            if (trip.status === TRIP_STATUS.CLAIMED || trip.status === TRIP_STATUS.COMPLETED) {
                assert(trip.assignedShop, `Claimed/Completed trip ${trip._id} must have assignedShop`);
            }
        }
        console.log("  ✓ Referential integrity verified: farmers, shops, products, and order-trip links all valid.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 3: Canonical lifecycle states strictly adhered to
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 3/10] Verifying canonical lifecycle states...");
        const validOrderStatuses = Object.values(ORDER_STATUS);
        const validTripStatuses = Object.values(TRIP_STATUS);

        // Check each order
        for (const ord of dbOrdersA) {
            assert(validOrderStatuses.includes(ord.status), `Invalid order status: ${ord.status}`);
            assert(ord.status !== "LOCKED" && ord.status !== "OPEN", `Bogus status detected: ${ord.status}`);
        }
        // Check order status distribution
        assert.strictEqual(summaryA.orders.byStatus.RECEIVED, 6, "Expected 6 RECEIVED orders");
        assert.strictEqual(summaryA.orders.byStatus.GROUPED, 4, "Expected 4 GROUPED orders");
        assert.strictEqual(summaryA.orders.byStatus.CLAIMED, 5, "Expected 5 CLAIMED orders");
        assert.strictEqual(summaryA.orders.byStatus.COMPLETED, 4, "Expected 4 COMPLETED orders");

        // Check each trip
        for (const trip of dbTripsA) {
            assert(validTripStatuses.includes(trip.status), `Invalid trip status: ${trip.status}`);
            assert(trip.status !== "LOCKED" && trip.status !== "OPEN", `Bogus status detected: ${trip.status}`);
        }
        // Check trip status distribution
        assert.strictEqual(summaryA.tripBlocks.byStatus.CREATED, 1, "Expected 1 CREATED trip");
        assert.strictEqual(summaryA.tripBlocks.byStatus.CLAIMED, 1, "Expected 1 CLAIMED trip");
        assert.strictEqual(summaryA.tripBlocks.byStatus.COMPLETED, 1, "Expected 1 COMPLETED trip");
        console.log("  ✓ All records use canonical lifecycle states. No 'LOCKED' or 'OPEN' states exist.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 4: Geographic distribution is realistic and grouping-compatible
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 4/10] Verifying realistic geographic corridors and cluster proximity...");
        const corridorNames = Object.keys(CORRIDORS);
        assert.strictEqual(corridorNames.length, 4, "Must define exactly 4 corridors");

        // Verify Rampura cluster spread (center: [77.3600, 23.2800])
        const rampuraOrders = dbOrdersA.filter(o => {
            const lng = o.location.coordinates[0];
            const lat = o.location.coordinates[1];
            return haversineKm(lat, lng, CORRIDORS.RAMPURA.center[1], CORRIDORS.RAMPURA.center[0]) < 5;
        });
        assert(rampuraOrders.length >= 6, `Rampura corridor should contain at least 6 orders (found ${rampuraOrders.length})`);

        // Check maximum distance between any pair in the Bilkisganj grouped trip (Trip 1)
        const trip1 = dbTripsA.find(t => t.status === TRIP_STATUS.CREATED);
        assert(trip1, "Bilkisganj trip (CREATED) must exist");
        const bilkisganjOrders = await Order.find({ _id: { $in: trip1.orders } });
        for (let i = 0; i < bilkisganjOrders.length; i++) {
            for (let j = i + 1; j < bilkisganjOrders.length; j++) {
                const dist = haversineKm(
                    bilkisganjOrders[i].location.coordinates[1],
                    bilkisganjOrders[i].location.coordinates[0],
                    bilkisganjOrders[j].location.coordinates[1],
                    bilkisganjOrders[j].location.coordinates[0]
                );
                assert(dist < 3.0, `Orders in Bilkisganj trip should be within 3km for grouping (found ${dist.toFixed(2)}km)`);
            }
        }
        console.log("  ✓ Geographic clustering confirmed realistic (< 3.0km cluster radius per corridor).");

        // ─────────────────────────────────────────────────────────────────
        // TEST 5: Re-running reset + seed produces the same logical structure
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 5/10] Verifying reproducibility (reset -> re-seed)...");
        await resetSessionData(testSessionA);
        const afterResetSummary = await getDemoDataSummary(testSessionA);
        assert.strictEqual(afterResetSummary.orders.total, 0, "Reset should yield 0 orders");
        assert.strictEqual(afterResetSummary.tripBlocks.total, 0, "Reset should yield 0 trip blocks");
        assert.strictEqual(afterResetSummary.notifications.total, 0, "Reset should yield 0 notifications");

        // Re-seed Session A
        await seedLogisticsScenario({ sessionId: testSessionA });
        const reseededSummary = await getDemoDataSummary(testSessionA);
        assert.strictEqual(reseededSummary.orders.total, 19, "Reseeded total orders must be 19");
        assert.strictEqual(reseededSummary.orders.byStatus.RECEIVED, 6, "Reseeded RECEIVED orders must be 6");
        assert.strictEqual(reseededSummary.orders.byStatus.GROUPED, 4, "Reseeded GROUPED orders must be 4");
        assert.strictEqual(reseededSummary.orders.byStatus.CLAIMED, 5, "Reseeded CLAIMED orders must be 5");
        assert.strictEqual(reseededSummary.orders.byStatus.COMPLETED, 4, "Reseeded COMPLETED orders must be 4");
        assert.strictEqual(reseededSummary.tripBlocks.total, 3, "Reseeded tripBlocks must be 3");
        console.log("  ✓ Reproducibility verified: identical logical structure produced upon re-seeding.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 6: Session reset cannot delete another session's records
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 6/10] Verifying multi-tenant session isolation during reset...");
        // Seed Session B alongside Session A
        await seedLogisticsScenario({ sessionId: testSessionB });
        const summaryBBefore = await getDemoDataSummary(testSessionB);
        assert.strictEqual(summaryBBefore.orders.total, 19, "Session B should have 19 orders");

        // Reset ONLY Session A
        const resetAResult = await resetSessionData(testSessionA);
        assert(resetAResult.deleted.orders > 0, "Session A orders should be deleted");

        // Verify Session A is empty, but Session B is completely untouched
        const summaryAAfter = await getDemoDataSummary(testSessionA);
        assert.strictEqual(summaryAAfter.orders.total, 0, "Session A orders must be 0 after reset");

        const summaryBAfter = await getDemoDataSummary(testSessionB);
        assert.strictEqual(summaryBAfter.orders.total, 19, "Session B orders must remain 19 after Session A reset");
        assert.strictEqual(summaryBAfter.tripBlocks.total, 3, "Session B tripBlocks must remain 3");
        assert.strictEqual(summaryBAfter.notifications.total, 4, "Session B notifications must remain 4");
        console.log("  ✓ Session isolation verified: Resetting Session A left Session B completely intact.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 7: Global reset cannot delete non-demo records
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 7/10] Verifying global reset safety against non-demo records...");
        // Call resetGlobalDemoData (which strictly queries { isDemo: true, demoSessionId: null })
        await resetGlobalDemoData();

        const currentNonDemoOrders = await Order.countDocuments({ isDemo: { $ne: true } });
        const currentNonDemoTrips = await TripBlock.countDocuments({ isDemo: { $ne: true } });
        const currentNonDemoFarmers = await Farmer.countDocuments({ isDemo: { $ne: true } });
        assert.strictEqual(currentNonDemoOrders, initialNonDemoOrders, "Non-demo orders count must not change");
        assert.strictEqual(currentNonDemoTrips, initialNonDemoTrips, "Non-demo trips count must not change");
        assert.strictEqual(currentNonDemoFarmers, initialNonDemoFarmers, "Non-demo farmers count must not change");
        console.log("  ✓ Global reset strictly scoped: zero non-demo records affected.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 8: Production/non-demo data remains unchanged
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 8/10] Verifying non-demo data baseline stability...");
        const finalNonDemoOrders = await Order.countDocuments({ isDemo: { $ne: true } });
        const finalNonDemoTrips = await TripBlock.countDocuments({ isDemo: { $ne: true } });
        const finalNonDemoFarmers = await Farmer.countDocuments({ isDemo: { $ne: true } });
        const finalNonDemoShops = await Shop.countDocuments({ isDemo: { $ne: true } });
        const finalNonDemoNotifs = await Notification.countDocuments({ isDemo: { $ne: true } });

        assert.strictEqual(finalNonDemoOrders, initialNonDemoOrders, "Non-demo orders changed!");
        assert.strictEqual(finalNonDemoTrips, initialNonDemoTrips, "Non-demo trips changed!");
        assert.strictEqual(finalNonDemoFarmers, initialNonDemoFarmers, "Non-demo farmers changed!");
        assert.strictEqual(finalNonDemoShops, initialNonDemoShops, "Non-demo shops changed!");
        assert.strictEqual(finalNonDemoNotifs, initialNonDemoNotifs, "Non-demo notifications changed!");
        console.log("  ✓ Production baseline 100% stable across all operations.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 9: Demo records excluded from production analytics/admin metrics
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 9/10] Verifying production analytics exclusion...");
        // Session B is still loaded in DB with 19 demo orders, 3 demo trips
        const platformAnalytics = await getPlatformAnalytics({ isDemo: false });
        // The totalOrders in production analytics should equal initialNonDemoOrders
        assert.strictEqual(platformAnalytics.summary.totalOrders, initialNonDemoOrders,
            `Platform analytics should count only non-demo orders (${initialNonDemoOrders}), but reported ${platformAnalytics.summary.totalOrders}`);

        const logisticsAnalytics = await getLogisticsAnalytics({ isDemo: false });
        assert.strictEqual(logisticsAnalytics.totalTripsEvaluated, initialNonDemoTrips,
            `Logistics analytics should count only non-demo trips (${initialNonDemoTrips}), but reported ${logisticsAnalytics.totalTripsEvaluated}`);
        console.log("  ✓ Production analytics strictly ignores demo records.");

        // ─────────────────────────────────────────────────────────────────
        // TEST 10: No external Twilio/WhatsApp notification dispatched
        // ─────────────────────────────────────────────────────────────────
        console.log("\n[Test 10/10] Verifying notification flags and external call suppression...");
        const sessionBNotifs = await Notification.find({ isDemo: true, "metadata.demoSessionId": testSessionB });
        assert.strictEqual(sessionBNotifs.length, 4, "Expected 4 demo notifications");
        for (const notif of sessionBNotifs) {
            assert.strictEqual(notif.isDemo, true, "Notification must have isDemo: true");
            assert.strictEqual(notif.metadata?.demoSessionId, testSessionB, "Notification must have demoSessionId in metadata");
            assert.strictEqual(notif.metadata?.isDemoNotification, true, "Notification must have isDemoNotification: true to suppress Twilio");
        }
        console.log("  ✓ All demo notifications flagged with isDemoNotification: true (external dispatch suppressed).");

        // ─────────────────────────────────────────────────────────────────
        // CLEANUP: Clean up test Session B
        // ─────────────────────────────────────────────────────────────────
        await resetSessionData(testSessionB);
        console.log("\n  ✓ Test Session B cleaned up cleanly.");

        console.log("\n===============================================================");
        console.log("  ALL 10 DEMO DATA & SEED SYSTEM VERIFICATION TESTS PASSED!    ");
        console.log("===============================================================\n");

    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        // Clean up on failure
        await resetSessionData(testSessionA).catch(() => {});
        await resetSessionData(testSessionB).catch(() => {});
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

runVerification();
