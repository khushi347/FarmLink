/**
 * notificationListeners.js — EventBus listeners for Module 12 Notification System
 * Listens to lifecycle events and dispatches notifications via notificationService.
 * All listeners are non-blocking to prevent any transaction failures.
 */

const eventBus = require("./eventBus");
const notificationService = require("../services/notificationService");

let initialized = false;

const setupNotificationListeners = () => {
    if (initialized) return;
    initialized = true;

    // 1. Order Received (Farmer WhatsApp)
    eventBus.on("order_received", async (data = {}) => {
        try {
            const { farmer, pendingOrder, isDemo } = data;
            if (farmer) {
                await notificationService.sendFarmerWhatsAppNotification({
                    farmer,
                    eventType: "order_received",
                    context: { pendingOrderId: pendingOrder?._id },
                    isDemo: Boolean(isDemo || farmer.isDemo),
                });
            }
        } catch (err) {
            console.error("[notificationListeners] order_received handler error:", err.message);
        }
    });

    // 2. Order Confirmed (Farmer WhatsApp)
    eventBus.on("order_confirmed", async (data = {}) => {
        try {
            const { order, farmer, farmerId, isDemo } = data;
            const targetFarmer = farmer || farmerId || order?.farmer;
            if (targetFarmer && order) {
                await notificationService.sendFarmerWhatsAppNotification({
                    farmer: targetFarmer,
                    eventType: "order_confirmed",
                    context: { orderId: order._id, serviceType: order.serviceType },
                    isDemo: Boolean(isDemo || order.isDemo),
                });
            }
        } catch (err) {
            console.error("[notificationListeners] order_confirmed handler error:", err.message);
        }
    });

    // 3. Order Grouped (Farmer WhatsApp)
    eventBus.on("order_grouped", async (data = {}) => {
        try {
            const { tripBlock, orderIds, orders } = data;
            const targetOrderIds = orderIds || (orders ? orders.map((o) => o._id) : []);
            await notificationService.notifyFarmersOrderGrouped({
                tripBlock,
                orderIds: targetOrderIds,
            });
        } catch (err) {
            console.error("[notificationListeners] order_grouped handler error:", err.message);
        }
    });

    // 4. Trip Created (Matching Shopkeepers: Socket.io + persistent)
    eventBus.on("trip_created", async (data = {}) => {
        try {
            const { tripBlock, shopIds } = data;
            if (tripBlock) {
                await notificationService.notifyMatchingShopkeepersForTrip(tripBlock, shopIds);
            }
        } catch (err) {
            console.error("[notificationListeners] trip_created handler error:", err.message);
        }
    });

    // 5. Trip Claimed / Trip Assigned (Farmer WhatsApp + Shopkeeper persistent)
    eventBus.on("trip_claimed", async (data = {}) => {
        try {
            const { tripId, shopId, userId, isDemo } = data;
            await notificationService.notifyTripClaimed({
                tripId,
                shopId,
                userId,
                isDemo,
            });
        } catch (err) {
            console.error("[notificationListeners] trip_claimed handler error:", err.message);
        }
    });

    // 6. Out for Delivery (Farmer WhatsApp)
    eventBus.on("out_for_delivery", async (data = {}) => {
        try {
            const { tripId, shopId, isDemo } = data;
            await notificationService.notifyOutForDelivery({
                tripId,
                isDemo,
            });
        } catch (err) {
            console.error("[notificationListeners] out_for_delivery handler error:", err.message);
        }
    });

    // 7. Trip Completed / Delivered (Farmer WhatsApp + Shopkeeper persistent)
    eventBus.on("trip_completed", async (data = {}) => {
        try {
            const { tripId, shopId, userId, isDemo } = data;
            await notificationService.notifyTripCompleted({
                tripId,
                shopId,
                userId,
                isDemo,
            });
        } catch (err) {
            console.error("[notificationListeners] trip_completed handler error:", err.message);
        }
    });

    // 8. Trip Cancelled (Shopkeeper Socket.io + persistent)
    eventBus.on("trip_cancelled", async (data = {}) => {
        try {
            const { tripId, shopId, userId, reason, isDemo } = data;
            await notificationService.notifyTripCancelled({
                tripId,
                shopId,
                userId,
                reason,
                isDemo,
            });
        } catch (err) {
            console.error("[notificationListeners] trip_cancelled handler error:", err.message);
        }
    });

    // 9. Delivery Reminder (Shopkeeper Socket.io + persistent)
    eventBus.on("delivery_reminder", async (data = {}) => {
        try {
            const { tripId, shopId, userId, isDemo, reminderText } = data;
            await notificationService.notifyDeliveryReminder({
                tripId,
                shopId,
                userId,
                isDemo,
                reminderText,
            });
        } catch (err) {
            console.error("[notificationListeners] delivery_reminder handler error:", err.message);
        }
    });

    console.log("[notificationListeners] EventBus notification listeners successfully initialized.");
};

module.exports = setupNotificationListeners;
