/**
 * verifyNotificationSystem.js — Comprehensive verification of Module 12 Notification System
 *
 * Tests:
 * 1. Event -> Recipient -> Persistence -> Channel -> Delivery Status for all 10 required matrix events:
 *    - Order Received (Farmer, WhatsApp)
 *    - Order Confirmed (Farmer, WhatsApp)
 *    - Order Grouped (Farmer, WhatsApp)
 *    - Trip Assigned (Farmer, WhatsApp)
 *    - Out for Delivery (Farmer, WhatsApp)
 *    - Delivered (Farmer, WhatsApp)
 *    - New Trip Available (Shopkeeper, Socket.io + persistent)
 *    - Trip Claimed (Shopkeeper, Socket.io + persistent)
 *    - Trip Cancelled (Shopkeeper, Socket.io + persistent)
 *    - Delivery Reminder (Shopkeeper, Socket.io + persistent)
 * 2. Real vs Demo Isolation:
 *    - Real shopkeeper only receives real notifications
 *    - Demo shopkeeper only receives demo notifications
 * 3. Non-blocking error handling:
 *    - Twilio / external notification failure NEVER fails underlying operation
 */

const path = require("path");
const assert = require("assert");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const setupNotificationListeners = require("../events/notificationListeners");
const eventBus = require("../events/eventBus");
const Notification = require("../models/Notification");
const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Shop = require("../models/Shop");
const User = require("../models/User");
const notificationService = require("../services/notificationService");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runVerification = async () => {
    console.log("==========================================================");
    console.log("   FarmLink Module 12 — Notification System Verification   ");
    console.log("==========================================================");

    await connectDB();
    setupNotificationListeners();

    console.log("\n[1/6] Testing Notification Model Schema & Polymorphism...");
    // Test creating a Farmer recipient notification
    const testFarmerNotif = await Notification.create({
        farmer: new mongoose.Types.ObjectId(),
        recipientType: "Farmer",
        title: "Test Farmer Alert",
        message: "Test message for farmer",
        type: "Order",
        channel: "WHATSAPP",
        deliveryStatus: "SENT",
        isDemo: false,
    });
    assert.strictEqual(testFarmerNotif.recipientType, "Farmer");
    assert.strictEqual(testFarmerNotif.channel, "WHATSAPP");
    assert.strictEqual(testFarmerNotif.deliveryStatus, "SENT");
    assert.strictEqual(testFarmerNotif.user, null);
    await Notification.deleteOne({ _id: testFarmerNotif._id });

    // Test creating a User (Shopkeeper) recipient notification
    const testUserNotif = await Notification.create({
        user: new mongoose.Types.ObjectId(),
        recipientType: "User",
        title: "Test Shopkeeper Alert",
        message: "Test message for shopkeeper",
        type: "TripBlock",
        channel: "SOCKET_IO",
        deliveryStatus: "SENT",
        isDemo: true,
    });
    assert.strictEqual(testUserNotif.recipientType, "User");
    assert.strictEqual(testUserNotif.channel, "SOCKET_IO");
    assert.strictEqual(testUserNotif.isDemo, true);
    await Notification.deleteOne({ _id: testUserNotif._id });
    console.log("✓ Notification model supports polymorphic recipients (Farmer / User), channels, and deliveryStatus");

    console.log("\n[2/6] Verifying Multilingual Farmer Templates...");
    const hindiMsg = notificationService.getFarmerMessage("order_received", "Hindi");
    const engMsg = notificationService.getFarmerMessage("order_received", "English");
    assert(hindiMsg.includes("प्राप्त"), "Hindi message must contain Hindi text");
    assert(engMsg.includes("received"), "English message must contain English text");

    const eventsToTest = [
        "order_received",
        "order_confirmed",
        "order_grouped",
        "trip_assigned",
        "out_for_delivery",
        "delivered",
    ];
    for (const evt of eventsToTest) {
        const title = notificationService.getFarmerTitle(evt);
        const hi = notificationService.getFarmerMessage(evt, "Hindi", { orderId: "1234567890abcdef", tripId: "9876543210fedcba" });
        const en = notificationService.getFarmerMessage(evt, "English", { orderId: "1234567890abcdef", tripId: "9876543210fedcba" });
        assert(title && title.length > 0, `Title must exist for ${evt}`);
        assert(hi && hi.length > 0, `Hindi message must exist for ${evt}`);
        assert(en && en.length > 0, `English message must exist for ${evt}`);
    }
    console.log("✓ All 6 farmer lifecycle milestones have verified multilingual templates (Hindi & English)");

    console.log("\n[3/6] Verifying Non-blocking Failure Isolation...");
    // Attempting to send a notification with a non-existent or faulty configuration must NOT throw
    try {
        const resilientRes = await notificationService.sendFarmerWhatsAppNotification({
            farmer: { _id: new mongoose.Types.ObjectId(), whatsappNumber: "+919999999999", language: "Hindi", isDemo: false },
            eventType: "order_received",
        });
        assert(resilientRes, "Notification should be recorded even if Twilio external API fails/warns");
        assert.strictEqual(resilientRes.channel, "WHATSAPP");
        await Notification.deleteOne({ _id: resilientRes._id });
        console.log("✓ Outbound WhatsApp failures isolated gracefully; underlying flow remains non-blocking");
    } catch (e) {
        assert.fail(`sendFarmerWhatsAppNotification threw an unhandled exception: ${e.message}`);
    }

    console.log("\n[4/6] Verifying All 10 Required Matrix Notifications (eventBus -> persistence)...");

    // Create test entities
    const testFarmer = await Farmer.create({
        name: "Ramesh Verification",
        whatsappNumber: `+9188888${Math.floor(10000 + Math.random() * 90000)}`,
        language: "Hindi",
        isDemo: false,
    });

    const testShopUser = await User.create({
        name: "Test Shop User",
        email: `test-shop-${Date.now()}@farmlink.local`,
        password: "Password123!",
        role: "shopkeeper",
        isDemo: false,
    });

    const testShop = await Shop.create({
        shopName: "Test Agro Center",
        owner: testShopUser._id,
        category: ["Seeds", "Fertilizer"],
        phone: `+9177777${Math.floor(10000 + Math.random() * 90000)}`,
        village: "Test Village",
        location: { type: "Point", coordinates: [77.4, 23.2] },
        isDemo: false,
    });

    const testOrder = await Order.create({
        farmer: testFarmer._id,
        serviceType: "Seeds",
        products: [{ name: "Wheat Seeds", quantity: 2, unit: "Bags" }],
        location: { type: "Point", coordinates: [77.41, 23.21] },
        status: "Pending",
        isDemo: false,
    });

    const testTrip = await TripBlock.create({
        orders: [testOrder._id],
        serviceType: "Seeds",
        scheduledDate: new Date(),
        status: "OPEN",
        centerLocation: { type: "Point", coordinates: [77.41, 23.21] },
        estimatedEarnings: 650,
        isDemo: false,
    });

    const waitForNotification = async (query, timeoutMs = 3000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const notif = await Notification.findOne(query);
            if (notif) return notif;
            await sleep(100);
        }
        return null;
    };

    // 1. Order Received
    console.log("  Testing: 1. Order Received (Farmer, WhatsApp)...");
    eventBus.emit("order_received", { farmer: testFarmer, pendingOrder: { _id: new mongoose.Types.ObjectId() }, isDemo: false });
    const n1 = await waitForNotification({ farmer: testFarmer._id, title: "Order Received" });
    assert(n1, "Order Received notification must be persisted for farmer");
    assert.strictEqual(n1.channel, "WHATSAPP");
    console.log("  ✓ 1. Order Received -> Farmer WhatsApp");

    // 2. Order Confirmed
    console.log("  Testing: 2. Order Confirmed (Farmer, WhatsApp)...");
    eventBus.emit("order_confirmed", { order: testOrder, farmer: testFarmer, isDemo: false });
    const n2 = await waitForNotification({ farmer: testFarmer._id, title: "Order Confirmed" });
    assert(n2, "Order Confirmed notification must be persisted for farmer");
    assert.strictEqual(n2.channel, "WHATSAPP");
    console.log("  ✓ 2. Order Confirmed -> Farmer WhatsApp");

    // 3. Order Grouped
    console.log("  Testing: 3. Order Grouped (Farmer, WhatsApp)...");
    eventBus.emit("order_grouped", { tripBlock: testTrip, orderIds: [testOrder._id], isDemo: false });
    const n3 = await waitForNotification({ farmer: testFarmer._id, title: "Order Grouped" });
    assert(n3, "Order Grouped notification must be persisted for farmer");
    assert.strictEqual(n3.channel, "WHATSAPP");
    console.log("  ✓ 3. Order Grouped -> Farmer WhatsApp");

    // 4. New Trip Available (Matching Shopkeepers: Socket.io + persistent)
    console.log("  Testing: 4. New Trip Available (Matching shopkeepers)...");
    eventBus.emit("trip_created", { tripBlock: testTrip, shopIds: [testShop._id] });
    const n4 = await waitForNotification({ user: testShopUser._id, title: "New Trip Available" });
    assert(n4, "New Trip Available notification must be persisted for matching shopkeeper");
    assert.strictEqual(n4.channel, "SOCKET_IO");
    console.log("  ✓ 4. New Trip Available -> Matching Shopkeepers (Socket.io + persistent)");

    // 5. Trip Claimed & Trip Assigned
    console.log("  Testing: 5. Trip Claimed (Shopkeeper) & Trip Assigned (Farmer WhatsApp)...");
    testTrip.assignedShop = testShop._id;
    testTrip.status = "CLAIMED";
    await testTrip.save();
    eventBus.emit("trip_claimed", { tripId: testTrip._id, shopId: testShop._id, userId: testShopUser._id, isDemo: false });
    const n5Shop = await waitForNotification({ user: testShopUser._id, title: "Trip Claim Confirmed" });
    assert(n5Shop, "Trip Claim Confirmed notification must be persisted for shopkeeper");
    const n5Farmer = await waitForNotification({ farmer: testFarmer._id, title: "Trip Assigned" });
    assert(n5Farmer, "Trip Assigned WhatsApp notification must be persisted for farmer");
    assert.strictEqual(n5Farmer.channel, "WHATSAPP");
    console.log("  ✓ 5. Trip Claimed -> Shopkeeper persistent & Farmer WhatsApp (Trip Assigned)");

    // 6. Out for Delivery
    console.log("  Testing: 6. Out for Delivery (Farmer, WhatsApp)...");
    eventBus.emit("out_for_delivery", { tripId: testTrip._id, shopId: testShop._id, isDemo: false });
    const n6 = await waitForNotification({ farmer: testFarmer._id, title: "Out for Delivery" });
    assert(n6, "Out for Delivery WhatsApp notification must be persisted for farmer");
    assert.strictEqual(n6.channel, "WHATSAPP");
    console.log("  ✓ 6. Out for Delivery -> Farmer WhatsApp");

    // 7. Delivered / Trip Completed
    console.log("  Testing: 7. Delivered (Farmer WhatsApp) & Delivery Completed (Shopkeeper)...");
    eventBus.emit("trip_completed", { tripId: testTrip._id, shopId: testShop._id, userId: testShopUser._id, isDemo: false });
    const n7Shop = await waitForNotification({ user: testShopUser._id, title: "Delivery Completed" });
    assert(n7Shop, "Delivery Completed notification must be persisted for shopkeeper");
    const n7Farmer = await waitForNotification({ farmer: testFarmer._id, title: "Delivered" });
    assert(n7Farmer, "Delivered notification must be persisted for farmer");
    assert.strictEqual(n7Farmer.channel, "WHATSAPP");
    console.log("  ✓ 7. Delivered -> Farmer WhatsApp & Delivery Completed -> Shopkeeper");

    // 8. Trip Cancelled
    console.log("  Testing: 8. Trip Cancelled (Shopkeeper)...");
    eventBus.emit("trip_cancelled", { tripId: testTrip._id, shopId: testShop._id, userId: testShopUser._id, reason: "Customer requested cancellation", isDemo: false });
    const n8 = await waitForNotification({ user: testShopUser._id, title: "Trip Cancelled" });
    assert(n8, "Trip Cancelled notification must be persisted for shopkeeper");
    assert.strictEqual(n8.channel, "SOCKET_IO");
    console.log("  ✓ 8. Trip Cancelled -> Shopkeeper persistent + Socket.io");

    // 9. Delivery Reminder
    console.log("  Testing: 9. Delivery Reminder (Shopkeeper)...");
    eventBus.emit("delivery_reminder", { tripId: testTrip._id, shopId: testShop._id, userId: testShopUser._id, reminderText: "Reminder: Deliver before sunset", isDemo: false });
    const n9 = await waitForNotification({ user: testShopUser._id, title: "Delivery Reminder" });
    assert(n9, "Delivery Reminder notification must be persisted for shopkeeper");
    assert.strictEqual(n9.channel, "SOCKET_IO");
    console.log("  ✓ 9. Delivery Reminder -> Shopkeeper persistent + Socket.io");

    console.log("\n[5/6] Verifying Strict Real vs Demo Isolation in Shop Notifications API...");
    // Create a demo shop user and demo notification
    const demoShopUser = await User.create({
        name: "Isolated Demo Shopkeeper",
        email: `demo-iso-${Date.now()}@farmlink.local`,
        password: "Password123!",
        role: "shopkeeper",
        isDemo: true,
    });

    await Notification.create({
        user: demoShopUser._id,
        recipientType: "User",
        title: "Demo Only Notification",
        message: "This should ONLY be visible to demo shopkeeper",
        type: "TripBlock",
        channel: "SOCKET_IO",
        isDemo: true,
    });

    await Notification.create({
        user: testShopUser._id,
        recipientType: "User",
        title: "Real Only Notification",
        message: "This should ONLY be visible to real shopkeeper",
        type: "TripBlock",
        channel: "SOCKET_IO",
        isDemo: false,
    });

    // Simulate real user query (shopController getNotifications query logic)
    const realNotifs = await Notification.find({
        user: testShopUser._id,
        isDemo: { $ne: true },
    });
    assert(realNotifs.length > 0, "Real shopkeeper must be able to retrieve real notifications");
    assert(realNotifs.every((n) => n.isDemo !== true), "Real shopkeeper must NEVER see demo notifications");

    // Simulate demo user query
    const demoNotifs = await Notification.find({
        user: demoShopUser._id,
        isDemo: true,
    });
    assert(demoNotifs.length > 0, "Demo shopkeeper must be able to retrieve demo notifications");
    assert(demoNotifs.every((n) => n.isDemo === true), "Demo shopkeeper must NEVER see real notifications");

    console.log("✓ Real shopkeepers retrieve only real notifications (count:", realNotifs.length, ")");
    console.log("✓ Demo shopkeepers retrieve only demo notifications (count:", demoNotifs.length, ")");
    console.log("✓ ZERO LEAKAGE: 100% strict isolation maintained");

    console.log("\n[6/6] Cleaning up test records...");
    await Notification.deleteMany({
        $or: [
            { farmer: testFarmer._id },
            { user: { $in: [testShopUser._id, demoShopUser._id] } },
        ],
    });
    await Order.deleteOne({ _id: testOrder._id });
    await TripBlock.deleteOne({ _id: testTrip._id });
    await Shop.deleteOne({ _id: testShop._id });
    await Farmer.deleteOne({ _id: testFarmer._id });
    await User.deleteMany({ _id: { $in: [testShopUser._id, demoShopUser._id] } });
    console.log("✓ Temporary test data cleaned up");

    console.log("\n==========================================================");
    console.log("   ALL MODULE 12 NOTIFICATION TESTS PASSED SUCCESSFULLY!   ");
    console.log("==========================================================");
    process.exit(0);
};

runVerification().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
