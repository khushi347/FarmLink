const downloadAudio = require("../utils/downloadAudio");
const { speechToText } = require("../services/speechService");
const extractOrder = require("../services/geminiService");
const Farmer = require("../models/Farmer");
const PendingWhatsAppOrder = require("../models/PendingWhatsAppOrder");
const ProcessedWebhook = require("../models/ProcessedWebhook");
const buildOrder = require("../services/orderService");
const eventBus = require("../events/eventBus");
const findShopsByService = require("../services/shopService");
const { logger } = require("../utils/logger");

const normalizePhone = (phone = "") => String(phone).replace(/\D/g, "");

const getLocalizedMessage = (language = "English", type = "location") => {
    const normalized = String(language || "English").toLowerCase();

    if (type === "location") {
        if (normalized.includes("hindi") || normalized.includes("hi")) {
            return "आर्डर की जानकारी मिल गई है। कृपया अपना WhatsApp स्थान साझा करें 📍";
        }

        if (normalized.includes("hinglish") || normalized.includes("mix") || normalized.includes("mixed")) {
            return "Order details received. Please share your WhatsApp location 📍";
        }

        return "Order details received. Please share your WhatsApp location 📍";
    }

    if (normalized.includes("hindi") || normalized.includes("hi")) {
        return "आपका ऑर्डर सफलतापूर्वक बन गया है। धन्यवाद! 🌱";
    }

    if (normalized.includes("hinglish") || normalized.includes("mix") || normalized.includes("mixed")) {
        return "Your order has been created successfully. Thank you! 🌱";
    }

    return "Your order has been created successfully. Thank you! 🌱";
};

const findOrCreateFarmerByWhatsApp = async (fromNumber) => {
    const raw = typeof fromNumber === "string" ? fromNumber.trim() : "";
    const cleaned = normalizePhone(raw);
    const candidates = [];

    if (raw) candidates.push(raw);
    if (cleaned) {
        candidates.push(cleaned, `+${cleaned}`, `whatsapp:${cleaned}`, `whatsapp:+${cleaned}`);
    }

    let farmer = await Farmer.findOne({
        whatsappNumber: { $in: candidates }
    });

    if (!farmer && cleaned) {
        const canonicalWhatsAppNumber = `+${cleaned}`;

        farmer = await Farmer.findOneAndUpdate(
            {
                whatsappNumber: {
                    $in: [canonicalWhatsAppNumber, cleaned, raw, `whatsapp:${cleaned}`, `whatsapp:+${cleaned}`]
                }
            },
            {
                $setOnInsert: {
                    name: "",
                    whatsappNumber: canonicalWhatsAppNumber,
                    language: "Hindi"
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );
    }

    if (!farmer) {
        throw new Error(`Unable to resolve or create Farmer for WhatsApp sender: ${fromNumber}`);
    }

    return farmer;
};

const mapLocation = (body = {}) => {
    const latitude = Number(body.Latitude ?? body.latitude);
    const longitude = Number(body.Longitude ?? body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        type: "Point",
        coordinates: [longitude, latitude]
    };
};

const savePendingOrder = async ({ farmerId, whatsappNumber, source, transcript, aiData, audioUrl, language }) => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const pending = await PendingWhatsAppOrder.findOneAndUpdate(
        {
            farmer: farmerId,
            status: "WAITING_FOR_LOCATION",
        },
        {
            $set: {
                farmer: farmerId,
                whatsappNumber,
                source,
                transcript,
                aiData,
                language,
                audioUrl,
                status: "WAITING_FOR_LOCATION",
                expiresAt,
            }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        }
    );

    return pending;
};

const handlewebHook = async (req, res) => {
    const body = req.body || {};
    const messageSid = body.MessageSid || body.SmsMessageSid || body.SmsSid || null;
    let webhookRecord = null;

    // Idempotency: Atomic registration with unique messageSid
    if (messageSid) {
        try {
            webhookRecord = await ProcessedWebhook.create({
                messageSid,
                status: "PROCESSING",
                source: "twilio_whatsapp"
            });
        } catch (dbErr) {
            if (dbErr.code === 11000) {
                // Duplicate webhook arrived!
                const existing = await ProcessedWebhook.findOne({ messageSid });
                if (existing && existing.status === "COMPLETED" && existing.responseXml) {
                    logger.info(`[Webhook Idempotency] Duplicate MessageSid ${messageSid} detected. Returning cached response.`);
                    res.type("text/xml");
                    return res.send(existing.responseXml);
                }

                logger.info(`[Webhook Idempotency] Duplicate MessageSid ${messageSid} currently in-flight. Acknowledging.`);
                res.type("text/xml");
                return res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`);
            }
            logger.warn(`[Webhook Idempotency] Error checking ProcessedWebhook: ${dbErr.message}`);
        }
    }

    try {
        const fromNumber = body.From || body.from || "";
        const location = mapLocation(body);

        if (location) {
            const farmer = await findOrCreateFarmerByWhatsApp(fromNumber);
            const pending = await PendingWhatsAppOrder.findOne({
                farmer: farmer._id,
                status: "WAITING_FOR_LOCATION",
            }).sort({ createdAt: -1 });

            if (!pending) {
                throw new Error("No pending WhatsApp order found for this farmer.");
            }

            const order = await buildOrder({
                farmerId: farmer._id,
                aiData: {
                    ...pending.aiData,
                    deliveryDate: pending.aiData.deliveryDate ?? pending.aiData.requestedDate ?? null,
                },
                transcript: pending.transcript,
                audioUrl: pending.audioUrl,
                location,
            });

            const shopIds = await findShopsByService(order.serviceType);
            eventBus.emit("new_order", { order, shopIds });
            eventBus.emit("order_confirmed", { order, farmer, isDemo: order.isDemo });

            await PendingWhatsAppOrder.deleteOne({ _id: pending._id });

            const successMessage = getLocalizedMessage(pending.language || "English", "success");
            const responseXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${successMessage}</Message>\n</Response>`;

            if (webhookRecord) {
                await ProcessedWebhook.updateOne(
                    { _id: webhookRecord._id },
                    { $set: { status: "COMPLETED", responseXml } }
                ).catch(() => {});
            }

            res.type("text/xml");
            return res.send(responseXml);
        }

        const farmer = await findOrCreateFarmerByWhatsApp(fromNumber);
        const fromText = (body.Body || body.body || "").trim();

        let transcript = fromText;
        let audioUrl = body.MediaUrl0 || body.mediaUrl0 || null;
        let source = "text";

        if (body.MediaContentType0?.startsWith("audio")) {
            const mediaUrl = body.MediaUrl0 || body.mediaUrl0;

            if (!mediaUrl) {
                throw new Error("WhatsApp audio message missing MediaUrl0");
            }

            const filePath = await downloadAudio(mediaUrl, `${Date.now()}.ogg`);
            transcript = await speechToText(filePath);
            audioUrl = mediaUrl;
            source = "voice";
        }

        if (!transcript) {
            throw new Error("No message body or transcript found for WhatsApp request");
        }

        const aiData = await extractOrder(transcript);

        if (!aiData || !aiData.serviceType || !Array.isArray(aiData.products)) {
            throw new Error("AI did not return a valid order payload");
        }

        const pending = await savePendingOrder({
            farmerId: farmer._id,
            whatsappNumber: farmer.whatsappNumber,
            source,
            transcript,
            aiData: {
                ...aiData,
                deliveryDate: aiData.deliveryDate ?? aiData.requestedDate ?? null,
            },
            audioUrl,
            language: aiData.language || "English",
        });

        eventBus.emit("order_received", {
            farmer,
            pendingOrder: pending,
            aiData,
            isDemo: Boolean(farmer.isDemo),
        });

        const locationMessage = getLocalizedMessage(aiData.language || "English", "location");
        const responseXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${locationMessage}</Message>\n</Response>`;

        if (webhookRecord) {
            await ProcessedWebhook.updateOne(
                { _id: webhookRecord._id },
                { $set: { status: "COMPLETED", responseXml } }
            ).catch(() => {});
        }

        res.type("text/xml");
        return res.send(responseXml);

    } catch (error) {
        logger.error(`[WhatsApp Webhook] Processing error: ${error.message}`, { error });

        if (webhookRecord) {
            await ProcessedWebhook.updateOne(
                { _id: webhookRecord._id },
                { $set: { status: "FAILED", errorMessage: error.message } }
            ).catch(() => {});
        }

        // Return a valid TwiML response with friendly message to avoid infinite Twilio retry loops
        res.type("text/xml");
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>Sorry, we encountered an error processing your request. Please try again.</Message>\n</Response>`);
    }
};

module.exports = handlewebHook;