/**
 * verifyLifecycleModule16.js — Module 16: Order & Trip Lifecycle Verification Suite
 *
 * Validates:
 * 1. Centralized lifecycle state machines (valid and invalid transitions)
 * 2. Order lifecycle: RECEIVED -> GROUPED -> CLAIMED -> COMPLETED
 * 3. TripBlock lifecycle: CREATED -> CLAIMED -> COMPLETED
 * 4. Rejection of invalid transitions (skips, backward, terminal changes)
 * 5. Concurrent claim race condition protection
 * 6. Multi-document transactional consistency across grouping, claiming, completion
 * 7. Deprecation / rejection of OUT_FOR_DELIVERY
 * 8. Cancellation lifecycle rules
 */

const path = require("path");
const assert = require("assert");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const {
    ORDER_STATUS,
    TRIP_STATUS,
    validateOrderTransition,
    validateTripTransition,
    canTransitionOrder,
    canTransitionTrip,
    InvalidStateTransitionError,
} = require("../services/lifecycleService");

const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");
const User = require("../models/User");

const groupOrder = require("../services/groupingService");
const claimTripService = require("../services/claimTripService");
const completeTripService = require("../services/completeTripService");

const runLifecycleVerification = async () => {
    console.log("===================================================================");
    console.log("  FarmLink Module 16 — Order & Trip Lifecycle Comprehensive Tests  ");
    console.log("===================================================================");

    await connectDB();

    // ─────────────────────────────────────────────────────────────────
    // Test 1: Order State Machine Unit Tests (Transitions & Rejections)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[1/7] Testing Order State Machine Transitions & Invariants...");

    // Valid transitions
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.RECEIVED, ORDER_STATUS.GROUPED));
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.GROUPED, ORDER_STATUS.CLAIMED));
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.CLAIMED, ORDER_STATUS.COMPLETED));
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED));
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.GROUPED, ORDER_STATUS.CANCELLED));
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.CLAIMED, ORDER_STATUS.CANCELLED));
    // Idempotent
    assert.doesNotThrow(() => validateOrderTransition(ORDER_STATUS.RECEIVED, ORDER_STATUS.RECEIVED));
    console.log("  ✓ Valid Order transitions allowed: RECEIVED -> GROUPED -> CLAIMED -> COMPLETED");

    // Invalid Order transitions (skips, backward, terminal)
    const invalidOrderTransitions = [
        [ORDER_STATUS.RECEIVED, ORDER_STATUS.CLAIMED, "Skip to CLAIMED"],
        [ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED, "Skip to COMPLETED"],
        [ORDER_STATUS.GROUPED, ORDER_STATUS.RECEIVED, "Backward to RECEIVED"],
        [ORDER_STATUS.GROUPED, ORDER_STATUS.COMPLETED, "Skip to COMPLETED"],
        [ORDER_STATUS.CLAIMED, ORDER_STATUS.GROUPED, "Backward to GROUPED"],
        [ORDER_STATUS.CLAIMED, ORDER_STATUS.RECEIVED, "Backward to RECEIVED"],
        [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLAIMED, "Terminal to CLAIMED"],
        [ORDER_STATUS.COMPLETED, ORDER_STATUS.RECEIVED, "Terminal to RECEIVED"],
        [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, "Terminal to CANCELLED"],
        [ORDER_STATUS.CANCELLED, ORDER_STATUS.COMPLETED, "Terminal Cancelled to COMPLETED"],
    ];

    for (const [from, to, desc] of invalidOrderTransitions) {
        assert.throws(
            () => validateOrderTransition(from, to),
            InvalidStateTransitionError,
            `Expected invalid order transition (${desc}) to throw InvalidStateTransitionError`
        );
        assert.strictEqual(canTransitionOrder(from, to), false);
    }
    console.log(`  ✓ All ${invalidOrderTransitions.length} invalid Order transitions correctly rejected with InvalidStateTransitionError.`);

    // ─────────────────────────────────────────────────────────────────
    // Test 2: TripBlock State Machine Unit Tests (Transitions & Rejections)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[2/7] Testing TripBlock State Machine Transitions & Invariants...");

    // Valid transitions
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CREATED, TRIP_STATUS.CLAIMED));
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CLAIMED, TRIP_STATUS.COMPLETED));
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CREATED, TRIP_STATUS.CANCELLED));
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CLAIMED, TRIP_STATUS.CANCELLED));
    // Idempotent
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CREATED, TRIP_STATUS.CREATED));
    console.log("  ✓ Valid TripBlock transitions allowed: CREATED -> CLAIMED -> COMPLETED");

    // Invalid TripBlock transitions
    const invalidTripTransitions = [
        [TRIP_STATUS.CREATED, TRIP_STATUS.COMPLETED, "Skip to COMPLETED"],
        [TRIP_STATUS.CLAIMED, TRIP_STATUS.CREATED, "Backward to CREATED"],
        [TRIP_STATUS.COMPLETED, TRIP_STATUS.CLAIMED, "Terminal to CLAIMED"],
        [TRIP_STATUS.COMPLETED, TRIP_STATUS.CREATED, "Terminal to CREATED"],
        [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED, "Terminal to CANCELLED"],
        [TRIP_STATUS.CANCELLED, TRIP_STATUS.COMPLETED, "Terminal Cancelled to COMPLETED"],
    ];

    for (const [from, to, desc] of invalidTripTransitions) {
        assert.throws(
            () => validateTripTransition(from, to),
            InvalidStateTransitionError,
            `Expected invalid trip transition (${desc}) to throw InvalidStateTransitionError`
        );
        assert.strictEqual(canTransitionTrip(from, to), false);
    }
    console.log(`  ✓ All ${invalidTripTransitions.length} invalid TripBlock transitions correctly rejected with InvalidStateTransitionError.`);

    // ─────────────────────────────────────────────────────────────────
    // Test 3: End-to-End Workflow with Full Transactional Consistency
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[3/7] Testing Full End-to-End Workflow (RECEIVED -> GROUPED -> CLAIMED -> COMPLETED)...");

    const testFarmer = await Farmer.create({
        name: "Test Farmer " + Date.now(),
        whatsappNumber: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        village: "Lifecycle Village",
        language: "hi",
        isDemo: true,
    });

    const testUser = await User.create({
        name: "Lifecycle Shopkeeper " + Date.now(),
        email: `shop_${Date.now()}@farmlink.local`,
        password: "TestPassword123!",
        role: "shopkeeper",
        isDemo: true,
    });

    const testShop = await Shop.create({
        owner: testUser._id,
        shopName: "Lifecycle Agrochemicals",
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        village: "Lifecycle Village",
        category: "Fertilizer",
        location: { type: "Point", coordinates: [77.4000, 23.2500] },
        isDemo: true,
    });

    // Step A: Ingestion -> Order created as RECEIVED
    const order1 = await Order.create({
        farmer: testFarmer._id,
        serviceType: "Fertilizer",
        products: [{ name: "Urea", quantity: 2, unit: "Bags" }],
        location: { type: "Point", coordinates: [77.4010, 23.2510] },
        requestedDate: new Date(Date.now() + 86400000),
        transcript: "2 bags of Urea",
        status: ORDER_STATUS.RECEIVED,
        isDemo: true,
    });

    const order2 = await Order.create({
        farmer: testFarmer._id,
        serviceType: "Fertilizer",
        products: [{ name: "DAP", quantity: 1, unit: "Bag" }],
        location: { type: "Point", coordinates: [77.4020, 23.2520] },
        requestedDate: new Date(Date.now() + 86400000),
        transcript: "1 bag of DAP",
        status: ORDER_STATUS.RECEIVED,
        isDemo: true,
    });

    assert.strictEqual(order1.status, ORDER_STATUS.RECEIVED, "New order status must be RECEIVED");
    assert.strictEqual(order2.status, ORDER_STATUS.RECEIVED, "New order status must be RECEIVED");
    console.log("  ✓ Step A: Orders created with status 'RECEIVED'.");

    // Step B: Grouping -> TripBlock CREATED, Orders GROUPED
    const groupResult = await groupOrder(order1._id);
    assert(groupResult.success, "Grouping should succeed");
    const tripBlock = groupResult.tripBlock;
    assert.strictEqual(tripBlock.status, TRIP_STATUS.CREATED, "TripBlock status must be CREATED");

    const groupedOrder1 = await Order.findById(order1._id);
    const groupedOrder2 = await Order.findById(order2._id);
    assert.strictEqual(groupedOrder1.status, ORDER_STATUS.GROUPED, "Order 1 status must be GROUPED");
    assert.strictEqual(groupedOrder2.status, ORDER_STATUS.GROUPED, "Order 2 status must be GROUPED");
    assert(groupedOrder1.tripBlock.equals(tripBlock._id), "Order 1 must be linked to TripBlock");
    console.log("  ✓ Step B: Grouping completed: TripBlock is 'CREATED', Orders are 'GROUPED'.");

    // Step C: Claiming -> TripBlock CLAIMED, Orders CLAIMED
    const claimedTrip = await claimTripService(tripBlock._id, testShop._id);
    assert.strictEqual(claimedTrip.status, TRIP_STATUS.CLAIMED, "TripBlock status must be CLAIMED");
    assert(claimedTrip.assignedShop.equals(testShop._id), "TripBlock must be assigned to shop");

    const claimedOrder1 = await Order.findById(order1._id);
    const claimedOrder2 = await Order.findById(order2._id);
    assert.strictEqual(claimedOrder1.status, ORDER_STATUS.CLAIMED, "Order 1 status must be CLAIMED");
    assert.strictEqual(claimedOrder2.status, ORDER_STATUS.CLAIMED, "Order 2 status must be CLAIMED");
    assert(claimedOrder1.assignedShop.equals(testShop._id), "Order 1 must be assigned to shop");
    console.log("  ✓ Step C: Claiming completed: TripBlock is 'CLAIMED', Orders are 'CLAIMED'.");

    // Step D: Completion -> TripBlock COMPLETED, Orders COMPLETED
    const completedTrip = await completeTripService(tripBlock._id, testShop._id);
    assert.strictEqual(completedTrip.status, TRIP_STATUS.COMPLETED, "TripBlock status must be COMPLETED");
    assert(completedTrip.completedAt instanceof Date, "completedAt timestamp must be recorded");

    const completedOrder1 = await Order.findById(order1._id);
    const completedOrder2 = await Order.findById(order2._id);
    assert.strictEqual(completedOrder1.status, ORDER_STATUS.COMPLETED, "Order 1 status must be COMPLETED");
    assert.strictEqual(completedOrder2.status, ORDER_STATUS.COMPLETED, "Order 2 status must be COMPLETED");
    console.log("  ✓ Step D: Completion completed: TripBlock is 'COMPLETED', Orders are 'COMPLETED'.");

    // ─────────────────────────────────────────────────────────────────
    // Test 4: Concurrent Claim Race Condition Protection
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[4/7] Testing Concurrent Claim Race Protection...");

    // Create another test shop
    const shop2User = await User.create({
        name: "Second Shopkeeper " + Date.now(),
        email: `shop2_${Date.now()}@farmlink.local`,
        password: "TestPassword123!",
        role: "shopkeeper",
        isDemo: true,
    });
    const testShop2 = await Shop.create({
        owner: shop2User._id,
        shopName: "Second Krishi Kendra",
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        village: "Lifecycle Village",
        category: "Fertilizer",
        location: { type: "Point", coordinates: [77.4050, 23.2550] },
        isDemo: true,
    });

    // Create a new TripBlock to claim
    const raceOrder = await Order.create({
        farmer: testFarmer._id,
        serviceType: "Fertilizer",
        products: [{ name: "Potash", quantity: 3, unit: "Bags" }],
        location: { type: "Point", coordinates: [77.4030, 23.2530] },
        requestedDate: new Date(),
        status: ORDER_STATUS.GROUPED,
        isDemo: true,
    });

    const raceTrip = await TripBlock.create({
        orders: [raceOrder._id],
        serviceType: "Fertilizer",
        scheduledDate: new Date(),
        centerLocation: { type: "Point", coordinates: [77.4030, 23.2530] },
        status: TRIP_STATUS.CREATED,
        isDemo: true,
    });

    // Simulate two simultaneous shopkeeper claims
    const claimPromises = [
        claimTripService(raceTrip._id, testShop._id).then(res => ({ success: true, shop: testShop._id, res })).catch(err => ({ success: false, error: err.message })),
        claimTripService(raceTrip._id, testShop2._id).then(res => ({ success: true, shop: testShop2._id, res })).catch(err => ({ success: false, error: err.message })),
    ];

    const results = await Promise.all(claimPromises);
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    assert.strictEqual(successes.length, 1, "Exactly ONE concurrent claim must succeed");
    assert.strictEqual(failures.length, 1, "Exactly ONE concurrent claim must fail");
    assert(
        failures[0].error.includes("Trip is no longer available") ||
        failures[0].error.includes("already claimed") ||
        failures[0].error.includes("Cannot transition"),
        `Failure message must be clear: got '${failures[0].error}'`
    );
    console.log("  ✓ Race protection verified: Exactly 1 shopkeeper won the claim; losing request was cleanly rejected.");

    // ─────────────────────────────────────────────────────────────────
    // Test 5: Rejection of Operations on Completed or Cancelled Trips
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[5/7] Testing Operation Invariants on Completed Trips...");

    // Trying to complete an already COMPLETED trip
    await assert.rejects(
        async () => completeTripService(completedTrip._id, testShop._id),
        InvalidStateTransitionError,
        "Re-completing an already completed trip must be rejected"
    );

    // Trying to claim an already COMPLETED trip
    await assert.rejects(
        async () => claimTripService(completedTrip._id, testShop._id),
        InvalidStateTransitionError,
        "Claiming a completed trip must be rejected"
    );
    console.log("  ✓ Completed trips cannot be re-claimed or re-completed.");

    // ─────────────────────────────────────────────────────────────────
    // Test 6: Cancellation Lifecycle Rules
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[6/7] Testing Cancellation Lifecycle Rules...");

    // Cannot cancel a COMPLETED trip
    assert.throws(
        () => validateTripTransition(TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED),
        InvalidStateTransitionError,
        "COMPLETED trip cannot be cancelled"
    );
    assert.throws(
        () => validateOrderTransition(ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED),
        InvalidStateTransitionError,
        "COMPLETED order cannot be cancelled"
    );

    // Can cancel a CREATED trip
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CREATED, TRIP_STATUS.CANCELLED));
    // Can cancel a CLAIMED trip
    assert.doesNotThrow(() => validateTripTransition(TRIP_STATUS.CLAIMED, TRIP_STATUS.CANCELLED));

    console.log("  ✓ Cancellation rules verified: CREATED and CLAIMED can be cancelled; COMPLETED cannot.");

    // ─────────────────────────────────────────────────────────────────
    // Test 7: OUT_FOR_DELIVERY Deprecation Check
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[7/7] Verifying OUT_FOR_DELIVERY Removal...");
    const { outForDelivery } = require("../controllers/TripController");
    const mockReq = { params: { tripId: completedTrip._id } };
    let mockStatusCode = null;
    let mockJsonBody = null;
    const mockRes = {
        status: (code) => {
            mockStatusCode = code;
            return {
                json: (body) => {
                    mockJsonBody = body;
                },
            };
        },
    };

    await outForDelivery(mockReq, mockRes);
    assert.strictEqual(mockStatusCode, 400, "outForDelivery must return 400 Bad Request");
    assert.strictEqual(mockJsonBody.success, false);
    assert(mockJsonBody.message.includes("deprecated"), "Must inform caller that OUT_FOR_DELIVERY is deprecated");
    console.log("  ✓ OUT_FOR_DELIVERY endpoint correctly deprecated (returns 400 with explanation).");

    // Cleanup test records
    await Farmer.deleteMany({ _id: testFarmer._id });
    await User.deleteMany({ _id: { $in: [testUser._id, shop2User._id] } });
    await Shop.deleteMany({ _id: { $in: [testShop._id, testShop2._id] } });
    await Order.deleteMany({ _id: { $in: [order1._id, order2._id, raceOrder._id] } });
    await TripBlock.deleteMany({ _id: { $in: [tripBlock._id, raceTrip._id] } });

    console.log("\n===================================================================");
    console.log("  ALL MODULE 16 LIFECYCLE TESTS PASSED WITH 100% SUCCESS!          ");
    console.log("===================================================================");
};

if (require.main === module) {
    runLifecycleVerification()
        .then(() => {
            process.exit(0);
        })
        .catch((err) => {
            console.error("\n❌ Lifecycle verification failed:", err);
            process.exit(1);
        });
}

module.exports = runLifecycleVerification;
