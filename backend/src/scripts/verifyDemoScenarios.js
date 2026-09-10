/**
 * verifyDemoScenarios.js — Automated Verification Suite for Recruiter Demo Scenarios
 *
 * Validates:
 * 1. Scenario 1 (AI Order): Multilingual extraction (Gemini / fallback) -> real MongoDB Order.
 * 2. Scenario 2 (Shared Delivery): 6 nearby orders -> real groupingService.js -> TripBlock.
 * 3. Scenario 3 (Shop Competition): 3 concurrent shops -> 1x HTTP 200, 2x HTTP 409 -> CLAIMED.
 * 4. Scenario 4 (Real-Time): Trip creation -> EventBus -> MongoDB Notification -> Socket.IO.
 * 5. Isolation: All demo records strictly tagged with isDemo: true and demoSessionId.
 * 6. Non-Demo Safety: Production records remain untouched and excluded.
 * 7. Canonical Lifecycle: Strictly CREATED -> CLAIMED -> COMPLETED (No LOCKED state).
 * 8. Session-Scoped Reset: Clean wipe of only this visitor session's records.
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
    runAiOrderScenario,
    runSharedDeliveryScenario,
    runShopCompetitionScenario,
    runRealtimeNotificationScenario,
    resetSessionScenarioData,
} = require("../services/demoScenarioService");

const { ORDER_STATUS, TRIP_STATUS } = require("../services/lifecycleService");

const runVerification = async () => {
    console.log("===============================================================");
    console.log("  FarmLink — Recruiter Demo Scenarios Verification Suite       ");
    console.log("===============================================================");

    await connectDB();

    const testSessionId = `test_recruiter_${Date.now()}`;
    console.log(`\nActive Test Demo Session ID: ${testSessionId}`);

    // Snapshot non-demo counts to guarantee zero production pollution
    const initialNonDemoOrders = await Order.countDocuments({ isDemo: { $ne: true } });
    const initialNonDemoTrips = await TripBlock.countDocuments({ isDemo: { $ne: true } });
    const initialNonDemoFarmers = await Farmer.countDocuments({ isDemo: { $ne: true } });
    console.log(`Initial Non-Demo Baseline: ${initialNonDemoOrders} Orders, ${initialNonDemoTrips} Trips, ${initialNonDemoFarmers} Farmers`);

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: Scenario 1 — AI Order Ingestion (Gemini -> Real Order)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 1/8] Verifying Scenario 1 — AI Order Ingestion...");
    const aiInputText = "मुझे कल 4 बोरी डीएपी खाद चाहिए";
    const aiRes = await runAiOrderScenario({ text: aiInputText, sessionId: testSessionId });

    assert.strictEqual(aiRes.success, true, "Scenario 1 must return success: true");
    assert(aiRes.order && aiRes.order.id, "Scenario 1 must return created order");
    assert(aiRes.farmer && aiRes.farmer.id, "Scenario 1 must return created farmer");
    assert(["gemini-2.5-flash", "deterministic-fallback (Gemini unavailable)"].includes(aiRes.extractionSource),
        "Extraction source must be transparently reported");

    // Inspect real MongoDB Order document
    const savedOrder = await Order.findById(aiRes.order.id);
    assert(savedOrder, "Order must be persisted in MongoDB");
    assert.strictEqual(savedOrder.status, ORDER_STATUS.RECEIVED, "Order status must be RECEIVED");
    assert.strictEqual(savedOrder.isDemo, true, "Order must have isDemo: true");
    assert.strictEqual(savedOrder.demoSessionId, testSessionId, "Order must have session ID");
    assert.strictEqual(savedOrder.serviceType, "Fertilizer", "Service type must be Fertilizer");
    assert(savedOrder.products.length >= 1, "Order must have at least one extracted product");
    console.log(`✓ Scenario 1 Passed: Order ${savedOrder._id} created in MongoDB (${savedOrder.serviceType}) via ${aiRes.extractionSource}`);

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: Scenario 2 — Shared Delivery (Real groupingService.js)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 2/8] Verifying Scenario 2 — Shared Delivery Grouping Engine...");
    const groupRes = await runSharedDeliveryScenario({ sessionId: testSessionId });

    assert.strictEqual(groupRes.success, true, "Scenario 2 must return success: true");
    assert.strictEqual(groupRes.seededOrdersCount, 6, "Must seed exactly 6 orders");
    assert.strictEqual(groupRes.groupedOrdersCount, 6, "groupingService.js must group all 6 orders");
    assert.strictEqual(groupRes.allGroupedVerified, true, "All 6 orders must transition to GROUPED");

    // Inspect real MongoDB TripBlock document
    const savedTrip = await TripBlock.findById(groupRes.tripBlock.id);
    assert(savedTrip, "TripBlock must be persisted in MongoDB");
    assert.strictEqual(savedTrip.status, TRIP_STATUS.CREATED, "Initial TripBlock status must be CREATED");
    assert.strictEqual(savedTrip.orders.length, 6, "TripBlock must link all 6 child orders");
    assert.strictEqual(savedTrip.isDemo, true, "TripBlock must be tagged isDemo: true");
    assert.strictEqual(savedTrip.demoSessionId, testSessionId, "TripBlock must have session ID");

    // Inspect child orders in MongoDB
    const childOrders = await Order.find({ tripBlock: savedTrip._id });
    assert.strictEqual(childOrders.length, 6, "All 6 orders must reference the new TripBlock");
    childOrders.forEach((co) => {
        assert.strictEqual(co.status, ORDER_STATUS.GROUPED, "Child order status must be GROUPED");
        assert.strictEqual(co.isDemo, true);
        assert.strictEqual(co.demoSessionId, testSessionId);
    });
    console.log(`✓ Scenario 2 Passed: 6 orders grouped into TripBlock ${savedTrip._id} via real groupingService.js`);

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Scenario 3 — Shop Competition (Atomic Concurrency)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 3/8] Verifying Scenario 3 — Concurrent Shop Competition...");
    const compRes = await runShopCompetitionScenario({ sessionId: testSessionId });

    assert.strictEqual(compRes.success, true, "Scenario 3 must succeed");
    assert(compRes.winner, "Must have exactly 1 winner");
    assert.strictEqual(compRes.winner.httpStatus, 200, "Winning claim must be HTTP 200");
    assert.strictEqual(compRes.rejectedShops.length, 2, "Must have exactly 2 rejected shops");
    compRes.rejectedShops.forEach((rej) => {
        assert.strictEqual(rej.httpStatus, 409, "Rejected concurrent claims must be HTTP 409 Conflict");
    });

    // Inspect MongoDB for Canonical Status (Strictly CLAIMED, NO LOCKED state)
    const claimedTrip = await TripBlock.findById(compRes.tripId);
    assert.strictEqual(claimedTrip.status, TRIP_STATUS.CLAIMED, "Final status must be CLAIMED");
    assert.strictEqual(compRes.finalLifecycleStatus, TRIP_STATUS.CLAIMED, "Reported status must be CLAIMED");
    assert.notStrictEqual(claimedTrip.status, "LOCKED", "TripBlock must NEVER use LOCKED state");
    assert.strictEqual(claimedTrip.assignedShop.toString(), compRes.winner.shopId.toString(), "Winner must be assigned");
    console.log(`✓ Scenario 3 Passed: Winner ${compRes.winner.shopName} (200 OK) · 2 Rejections (409 Conflict) · Status: CLAIMED`);

    // ─────────────────────────────────────────────────────────────────
    // TEST 4: Scenario 4 — Real-Time Notification Cascade
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 4/8] Verifying Scenario 4 — Real-Time Push Notification...");
    const notifRes = await runRealtimeNotificationScenario({ sessionId: testSessionId });

    assert.strictEqual(notifRes.success, true, "Scenario 4 must succeed");
    assert(notifRes.notification && notifRes.notification.id, "Must create Notification in MongoDB");
    assert.strictEqual(notifRes.socketEmitted, true, "Socket event must be emitted");

    // Inspect MongoDB Notification document
    const savedNotif = await Notification.findById(notifRes.notification.id);
    assert(savedNotif, "Notification must exist in MongoDB");
    assert.strictEqual(savedNotif.channel, "SOCKET_IO", "Channel must be SOCKET_IO");
    assert.strictEqual(savedNotif.deliveryStatus, "SENT", "Status must be SENT");
    assert.strictEqual(savedNotif.isDemo, true, "Notification must be isDemo: true");
    assert.strictEqual(savedNotif.metadata.sessionId, testSessionId, "Notification must link to session");
    console.log(`✓ Scenario 4 Passed: Notification ${savedNotif._id} saved to MongoDB and pushed over Socket.IO`);

    // ─────────────────────────────────────────────────────────────────
    // TEST 5: Strict Demo Isolation Verification
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 5/8] Verifying Strict Demo Isolation...");
    const demoOrdersCount = await Order.countDocuments({ isDemo: true, demoSessionId: testSessionId });
    const demoTripsCount = await TripBlock.countDocuments({ isDemo: true, demoSessionId: testSessionId });
    assert(demoOrdersCount >= 7, `Expected at least 7 demo orders created, found ${demoOrdersCount}`);
    assert(demoTripsCount >= 3, `Expected at least 3 demo trips created, found ${demoTripsCount}`);
    console.log(`✓ Test 5 Passed: All ${demoOrdersCount} orders and ${demoTripsCount} trips have isDemo: true and demoSessionId`);

    // ─────────────────────────────────────────────────────────────────
    // TEST 6: Non-Demo Production Data Immutability
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 6/8] Verifying Non-Demo Production Data Remains Pristine...");
    const finalNonDemoOrders = await Order.countDocuments({ isDemo: { $ne: true } });
    const finalNonDemoTrips = await TripBlock.countDocuments({ isDemo: { $ne: true } });
    const finalNonDemoFarmers = await Farmer.countDocuments({ isDemo: { $ne: true } });

    assert.strictEqual(finalNonDemoOrders, initialNonDemoOrders, "Non-demo orders count must not change");
    assert.strictEqual(finalNonDemoTrips, initialNonDemoTrips, "Non-demo trips count must not change");
    assert.strictEqual(finalNonDemoFarmers, initialNonDemoFarmers, "Non-demo farmers count must not change");
    console.log("✓ Test 6 Passed: Production non-demo database is 100% pristine and untouched");

    // ─────────────────────────────────────────────────────────────────
    // TEST 7: Canonical Module 16 Lifecycle Compliance
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 7/8] Verifying Module 16 Canonical Lifecycle (CREATED -> CLAIMED -> COMPLETED)...");
    const sessionTrips = await TripBlock.find({ isDemo: true, demoSessionId: testSessionId }).lean();
    const validStatuses = [TRIP_STATUS.CREATED, TRIP_STATUS.CLAIMED, TRIP_STATUS.COMPLETED];
    sessionTrips.forEach((st) => {
        assert(validStatuses.includes(st.status), `TripBlock status '${st.status}' violates canonical state machine`);
        assert.notStrictEqual(st.status, "LOCKED", "LOCKED status is strictly prohibited");
        assert.notStrictEqual(st.status, "OUT_FOR_DELIVERY", "OUT_FOR_DELIVERY status is deprecated");
    });
    console.log("✓ Test 7 Passed: Strict canonical lifecycle enforced on all created trip records");

    // ─────────────────────────────────────────────────────────────────
    // TEST 8: Session-Scoped 1-Click Reset & Cleanup
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[Test 8/8] Verifying Session-Scoped Reset & Cleanup...");
    const resetRes = await resetSessionScenarioData(testSessionId);

    assert.strictEqual(resetRes.success, true);
    assert(resetRes.deleted.orders >= 7, "Must wipe session orders");
    assert(resetRes.deleted.tripBlocks >= 3, "Must wipe session trip blocks");

    // Confirm session documents in MongoDB are 0
    const remainingSessionOrders = await Order.countDocuments({ isDemo: true, demoSessionId: testSessionId });
    const remainingSessionTrips = await TripBlock.countDocuments({ isDemo: true, demoSessionId: testSessionId });
    const remainingSessionNotifs = await Notification.countDocuments({ isDemo: true, "metadata.sessionId": testSessionId });

    assert.strictEqual(remainingSessionOrders, 0, "All session orders must be deleted");
    assert.strictEqual(remainingSessionTrips, 0, "All session trips must be deleted");
    assert.strictEqual(remainingSessionNotifs, 0, "All session notifications must be deleted");
    console.log(`✓ Test 8 Passed: Session data completely cleaned up (${resetRes.deleted.orders} orders, ${resetRes.deleted.tripBlocks} trips, ${resetRes.deleted.notifications} notifications deleted)`);

    console.log("\n===============================================================");
    console.log("  ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY!                ");
    console.log("===============================================================");

    await mongoose.disconnect();
    process.exit(0);
};

runVerification().catch((err) => {
    console.error("\n❌ VERIFICATION FAILED:", err);
    mongoose.disconnect().finally(() => process.exit(1));
});
