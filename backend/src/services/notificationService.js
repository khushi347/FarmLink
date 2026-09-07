const twilio = require("twilio");
const Notification = require("../models/Notification");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");

// Initialize Twilio client if credentials are present
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (err) {
        console.warn("[notificationService] Twilio initialization warning:", err.message);
    }
}

/**
 * Normalizes phone numbers to Twilio WhatsApp E.164 format: whatsapp:+<digits>
 */
const formatWhatsAppNumber = (phone) => {
    if (!phone) return "";
    let cleaned = String(phone).trim();
    if (cleaned.startsWith("whatsapp:")) {
        cleaned = cleaned.replace("whatsapp:", "").trim();
    }
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (!digitsOnly) return "";
    // If doesn't start with country code, default to +91 (India) if 10 digits
    if (digitsOnly.length === 10) {
        return `whatsapp:+91${digitsOnly}`;
    }
    return `whatsapp:+${digitsOnly}`;
};

/**
 * Returns localized WhatsApp messages for farmers
 */
const getFarmerMessage = (eventType, language = "Hindi", context = {}) => {
    const lang = String(language || "Hindi").toLowerCase();
    const isHindi = lang.includes("hindi") || lang.includes("hi");
    const code = context.orderId ? `#${String(context.orderId).slice(-4).toUpperCase()}` : "";
    const tripCode = context.tripId ? `#${String(context.tripId).slice(-4).toUpperCase()}` : "";

    switch (eventType) {
        case "order_received":
            return isHindi
                ? `नमस्ते! आपका ऑर्डर अनुरोध प्राप्त हो गया है। स्थान की पुष्टि के बाद यह प्रोसेस होगा। 🌱`
                : `Hello! We have received your order request. It will be processed upon location confirmation. 🌱`;

        case "order_confirmed":
            return isHindi
                ? `आपका ऑर्डर ${code} सफलतापूर्वक कन्फर्म हो गया है। धन्यवाद! 🌱`
                : `Your order ${code} has been confirmed successfully. Thank you! 🌱`;

        case "order_grouped":
            return isHindi
                ? `शुभ समाचार! आपका ऑर्डर ${code} अन्य नजदीकी ऑर्डर्स के साथ क्लब (ग्रुप) कर दिया गया है। 🚜`
                : `Great news! Your order ${code} has been grouped with nearby orders for delivery. 🚜`;

        case "trip_assigned":
            return isHindi
                ? `आपके ऑर्डर ${code} के लिए डिलीवरी ट्रिप ${tripCode} असाइन कर दी गई है। दुकान जल्द माल रवाना करेगी। 📦`
                : `Trip ${tripCode} has been assigned for your order ${code}. The shop will dispatch it soon. 📦`;

        case "out_for_delivery":
            return isHindi
                ? `आपका ऑर्डर ${code} डिलीवरी के लिए निकल चुका है! जल्द ही आपके पास पहुंचेगा। 🚚`
                : `Your order ${code} is out for delivery! It will reach you shortly. 🚚`;

        case "delivered":
            return isHindi
                ? `आपका ऑर्डर ${code} सफलतापूर्वक डिलीवर हो गया है। FarmLink का उपयोग करने के लिए धन्यवाद! 🌾`
                : `Your order ${code} has been delivered successfully. Thank you for choosing FarmLink! 🌾`;

        default:
            return isHindi
                ? `आपके ऑर्डर से संबंधित नया अपडेट उपलब्ध है।`
                : `A new update is available for your order.`;
    }
};

const getFarmerTitle = (eventType) => {
    switch (eventType) {
        case "order_received": return "Order Received";
        case "order_confirmed": return "Order Confirmed";
        case "order_grouped": return "Order Grouped";
        case "trip_assigned": return "Trip Assigned";
        case "out_for_delivery": return "Out for Delivery";
        case "delivered": return "Delivered";
        default: return "Order Update";
    }
};

/**
 * Sends a non-blocking WhatsApp notification to a farmer via Twilio,
 * and creates a persistent Notification record in MongoDB.
 */
const sendFarmerWhatsAppNotification = async ({
    farmer,
    eventType,
    context = {},
    isDemo = false,
    customMessage = null,
}) => {
    try {
        let farmerDoc = farmer;
        if (!farmerDoc || typeof farmerDoc !== "object" || !farmerDoc.whatsappNumber) {
            if (farmer && (typeof farmer === "string" || farmer._id)) {
                farmerDoc = await Farmer.findById(farmer._id || farmer);
            }
        }

        if (!farmerDoc) {
            console.warn("[notificationService] Farmer not found for WhatsApp notification:", farmer);
            return null;
        }

        const title = getFarmerTitle(eventType);
        const language = farmerDoc.language || "Hindi";
        const body = customMessage || getFarmerMessage(eventType, language, context);
        const isDemoNotification = Boolean(isDemo || farmerDoc.isDemo);

        const formattedTo = formatWhatsAppNumber(farmerDoc.whatsappNumber);
        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || "whatsapp:+14155238886";

        // Persist notification to MongoDB immediately
        const notif = await Notification.create({
            farmer: farmerDoc._id,
            recipientType: "Farmer",
            title,
            message: body,
            type: "Order",
            channel: "WHATSAPP",
            deliveryStatus: isDemoNotification ? "SENT" : (twilioClient ? "PENDING" : "SENT"),
            isDemo: isDemoNotification,
            metadata: {
                ...context,
                eventType,
                language,
                whatsappNumber: farmerDoc.whatsappNumber,
            },
        });

        // Outbound Twilio WhatsApp dispatch for real non-demo notifications (non-blocking)
        if (!isDemoNotification && twilioClient && formattedTo) {
            twilioClient.messages.create({
                from: fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`,
                to: formattedTo,
                body,
            }).then((twilioRes) => {
                console.log(`[notificationService] Twilio WhatsApp message sent (${twilioRes.sid}) to ${formattedTo}`);
                Notification.findByIdAndUpdate(notif._id, { deliveryStatus: "SENT" }).catch(() => {});
            }).catch((twilioErr) => {
                console.warn(`[notificationService] Twilio WhatsApp dispatch failed for ${formattedTo}:`, twilioErr.message);
                Notification.findByIdAndUpdate(notif._id, { deliveryStatus: "FAILED" }).catch(() => {});
            });
        }

        return notif;
    } catch (err) {
        // Non-blocking isolation: Never throw to the caller
        console.error("[notificationService] sendFarmerWhatsAppNotification error:", err.message);
        return null;
    }
};

/**
 * Creates a persistent notification for a shopkeeper (User),
 * marked with channel SOCKET_IO / IN_APP.
 */
const sendShopkeeperNotification = async ({
    userId,
    title,
    message,
    type = "TripBlock",
    channel = "SOCKET_IO",
    isDemo = false,
    metadata = {},
}) => {
    try {
        if (!userId) {
            console.warn("[notificationService] sendShopkeeperNotification missing userId");
            return null;
        }

        const notif = await Notification.create({
            user: userId,
            recipientType: "User",
            title,
            message,
            type,
            channel,
            deliveryStatus: "SENT",
            isDemo: Boolean(isDemo),
            metadata,
        });

        return notif;
    } catch (err) {
        // Non-blocking isolation
        console.error("[notificationService] sendShopkeeperNotification error:", err.message);
        return null;
    }
};

/**
 * Handles "trip_created" event:
 * Finds matching shopkeepers (by service type and demo isolation)
 * and creates persistent "New Trip Available" notifications for each matching shopkeeper.
 */
const notifyMatchingShopkeepersForTrip = async (tripBlock, shopIds = []) => {
    try {
        if (!tripBlock) return;
        const isDemo = Boolean(tripBlock.isDemo);

        let targetShopIds = shopIds;
        if (!targetShopIds || targetShopIds.length === 0) {
            const query = {
                category: tripBlock.serviceType,
                isDemo: isDemo ? true : { $ne: true },
            };
            const matchingShops = await Shop.find(query).select("_id owner");
            targetShopIds = matchingShops.map((s) => s._id);
        }

        const shops = await Shop.find({
            _id: { $in: targetShopIds },
            isDemo: isDemo ? true : { $ne: true },
        }).populate("owner");

        const tripCode = `Trip #${String(tripBlock._id).slice(-4).toUpperCase()}`;
        const earnings = tripBlock.estimatedEarnings || 0;
        const title = "New Trip Available";
        const message = `A new ${tripBlock.serviceType} trip (${tripCode}) is available in your area with estimated earnings of ₹${earnings}.`;

        for (const shop of shops) {
            const ownerId = shop.owner?._id || shop.owner;
            if (ownerId) {
                await sendShopkeeperNotification({
                    userId: ownerId,
                    title,
                    message,
                    type: "TripBlock",
                    channel: "SOCKET_IO",
                    isDemo,
                    metadata: {
                        tripId: tripBlock._id,
                        serviceType: tripBlock.serviceType,
                        earnings,
                        shopId: shop._id,
                    },
                });
            }
        }
    } catch (err) {
        console.error("[notificationService] notifyMatchingShopkeepersForTrip error:", err.message);
    }
};

/**
 * Handles "order_grouped" event:
 * Sends WhatsApp notification to each farmer of the grouped orders.
 */
const notifyFarmersOrderGrouped = async ({ tripBlock, orderIds = [] }) => {
    try {
        let orders = [];
        if (orderIds && orderIds.length > 0) {
            orders = await Order.find({ _id: { $in: orderIds } }).populate("farmer");
        } else if (tripBlock && tripBlock.orders) {
            orders = await Order.find({ _id: { $in: tripBlock.orders } }).populate("farmer");
        }

        for (const order of orders) {
            if (order.farmer) {
                await sendFarmerWhatsAppNotification({
                    farmer: order.farmer,
                    eventType: "order_grouped",
                    context: {
                        orderId: order._id,
                        tripId: tripBlock?._id,
                        serviceType: order.serviceType,
                    },
                    isDemo: Boolean(tripBlock?.isDemo || order.isDemo),
                });
            }
        }
    } catch (err) {
        console.error("[notificationService] notifyFarmersOrderGrouped error:", err.message);
    }
};

/**
 * Handles "trip_claimed" event:
 * 1. Persistent notification to the claiming shopkeeper
 * 2. WhatsApp notification ("trip_assigned") to each farmer of orders in this trip
 */
const notifyTripClaimed = async ({ tripId, shopId, userId, isDemo = false }) => {
    try {
        const trip = await TripBlock.findById(tripId).populate({
            path: "orders",
            populate: { path: "farmer" },
        });

        if (!trip) return;

        const isDemoTrip = Boolean(isDemo || trip.isDemo);
        const code = `Trip #${String(trip._id).slice(-4).toUpperCase()}`;

        // 1. Notify shopkeeper
        let ownerId = userId;
        if (!ownerId && shopId) {
            const shop = await Shop.findById(shopId);
            ownerId = shop?.owner;
        }

        if (ownerId) {
            await sendShopkeeperNotification({
                userId: ownerId,
                title: "Trip Claim Confirmed",
                message: `You claimed ${code}. This trip is no longer available to other shops.`,
                type: "TripBlock",
                channel: "SOCKET_IO",
                isDemo: isDemoTrip,
                metadata: { tripId: trip._id, code, shopId },
            });
        }

        // 2. Notify farmers of orders in this trip
        if (Array.isArray(trip.orders)) {
            for (const order of trip.orders) {
                if (order.farmer) {
                    await sendFarmerWhatsAppNotification({
                        farmer: order.farmer,
                        eventType: "trip_assigned",
                        context: {
                            orderId: order._id,
                            tripId: trip._id,
                            serviceType: trip.serviceType,
                        },
                        isDemo: isDemoTrip,
                    });
                }
            }
        }
    } catch (err) {
        console.error("[notificationService] notifyTripClaimed error:", err.message);
    }
};

/**
 * Handles "out_for_delivery" event:
 * Sends WhatsApp notification to farmers of orders in this trip.
 */
const notifyOutForDelivery = async ({ tripId, isDemo = false }) => {
    try {
        const trip = await TripBlock.findById(tripId).populate({
            path: "orders",
            populate: { path: "farmer" },
        });

        if (!trip) return;
        const isDemoTrip = Boolean(isDemo || trip.isDemo);

        if (Array.isArray(trip.orders)) {
            for (const order of trip.orders) {
                if (order.farmer) {
                    await sendFarmerWhatsAppNotification({
                        farmer: order.farmer,
                        eventType: "out_for_delivery",
                        context: {
                            orderId: order._id,
                            tripId: trip._id,
                            serviceType: trip.serviceType,
                        },
                        isDemo: isDemoTrip,
                    });
                }
            }
        }
    } catch (err) {
        console.error("[notificationService] notifyOutForDelivery error:", err.message);
    }
};

/**
 * Handles "trip_completed" event:
 * 1. Persistent notification to the shopkeeper
 * 2. WhatsApp notification ("delivered") to each farmer of orders in this trip
 */
const notifyTripCompleted = async ({ tripId, shopId, userId, isDemo = false }) => {
    try {
        const trip = await TripBlock.findById(tripId).populate({
            path: "orders",
            populate: { path: "farmer" },
        });

        if (!trip) return;
        const isDemoTrip = Boolean(isDemo || trip.isDemo);
        const code = `Trip #${String(trip._id).slice(-4).toUpperCase()}`;

        // 1. Notify shopkeeper
        let ownerId = userId;
        if (!ownerId && shopId) {
            const shop = await Shop.findById(shopId);
            ownerId = shop?.owner;
        }

        if (ownerId) {
            await sendShopkeeperNotification({
                userId: ownerId,
                title: "Delivery Completed",
                message: `${code} completed successfully. ₹${trip.estimatedEarnings || 0} credited to your revenue.`,
                type: "TripBlock",
                channel: "SOCKET_IO",
                isDemo: isDemoTrip,
                metadata: {
                    tripId: trip._id,
                    code,
                    earnings: trip.estimatedEarnings,
                    shopId,
                },
            });
        }

        // 2. Notify farmers of orders in this trip
        if (Array.isArray(trip.orders)) {
            for (const order of trip.orders) {
                if (order.farmer) {
                    await sendFarmerWhatsAppNotification({
                        farmer: order.farmer,
                        eventType: "delivered",
                        context: {
                            orderId: order._id,
                            tripId: trip._id,
                            serviceType: trip.serviceType,
                        },
                        isDemo: isDemoTrip,
                    });
                }
            }
        }
    } catch (err) {
        console.error("[notificationService] notifyTripCompleted error:", err.message);
    }
};

/**
 * Handles "trip_cancelled" event:
 * Persistent notification to the relevant shopkeeper.
 */
const notifyTripCancelled = async ({ tripId, shopId, userId, reason = "", isDemo = false }) => {
    try {
        const trip = await TripBlock.findById(tripId);
        const code = trip ? `Trip #${String(trip._id).slice(-4).toUpperCase()}` : `Trip #${String(tripId).slice(-4).toUpperCase()}`;
        const isDemoTrip = Boolean(isDemo || trip?.isDemo);

        let ownerId = userId;
        if (!ownerId && shopId) {
            const shop = await Shop.findById(shopId);
            ownerId = shop?.owner;
        }

        if (ownerId) {
            await sendShopkeeperNotification({
                userId: ownerId,
                title: "Trip Cancelled",
                message: `${code} has been cancelled${reason ? `: ${reason}` : "."}`,
                type: "TripBlock",
                channel: "SOCKET_IO",
                isDemo: isDemoTrip,
                metadata: { tripId, shopId, reason },
            });
        }
    } catch (err) {
        console.error("[notificationService] notifyTripCancelled error:", err.message);
    }
};

/**
 * Handles "delivery_reminder" event:
 * Persistent notification to the relevant shopkeeper.
 */
const notifyDeliveryReminder = async ({ tripId, shopId, userId, isDemo = false, reminderText = "" }) => {
    try {
        const trip = await TripBlock.findById(tripId);
        const code = trip ? `Trip #${String(trip._id).slice(-4).toUpperCase()}` : `Trip #${String(tripId).slice(-4).toUpperCase()}`;
        const isDemoTrip = Boolean(isDemo || trip?.isDemo);

        let ownerId = userId;
        if (!ownerId && shopId) {
            const shop = await Shop.findById(shopId);
            ownerId = shop?.owner;
        }

        if (ownerId) {
            await sendShopkeeperNotification({
                userId: ownerId,
                title: "Delivery Reminder",
                message: reminderText || `Reminder: You have an active delivery scheduled for ${code}. Please complete on time.`,
                type: "TripBlock",
                channel: "SOCKET_IO",
                isDemo: isDemoTrip,
                metadata: { tripId, shopId },
            });
        }
    } catch (err) {
        console.error("[notificationService] notifyDeliveryReminder error:", err.message);
    }
};

module.exports = {
    formatWhatsAppNumber,
    getFarmerMessage,
    getFarmerTitle,
    sendFarmerWhatsAppNotification,
    sendShopkeeperNotification,
    notifyMatchingShopkeepersForTrip,
    notifyFarmersOrderGrouped,
    notifyTripClaimed,
    notifyOutForDelivery,
    notifyTripCompleted,
    notifyTripCancelled,
    notifyDeliveryReminder,
};
