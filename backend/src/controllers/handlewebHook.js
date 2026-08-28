const downloadAudio = require("../utils/downloadAudio");
const { speechToText } = require("../services/speechService");
const extractOrder = require("../services/geminiService");
const Farmer = require("../models/Farmer");
const PendingWhatsAppOrder = require("../models/PendingWhatsAppOrder");
const buildOrder = require("../services/orderService");
const eventBus = require("../events/eventBus");
const findShopsByService = require("../services/shopService");

const normalizePhone = (phone = "") => String(phone).replace(/\D/g, "");

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

const savePendingOrder = async ({ farmerId, whatsappNumber, source, transcript, aiData, audioUrl }) => {
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
    try {
        console.log("1. webhook entered");
        const body = req.body || {};
        const fromNumber = body.From || body.from || "";
        const location = mapLocation(body);
        console.log("2. location parsed", location);

        if (location) {
            console.log("3. location branch entered");
            console.log("4. farmer lookup starting for location message");
            const farmer = await findOrCreateFarmerByWhatsApp(fromNumber);
            console.log("5. farmer lookup completed", farmer && farmer._id);
            console.log("6. pending order lookup starting");
            const pending = await PendingWhatsAppOrder.findOne({
                farmer: farmer._id,
                status: "WAITING_FOR_LOCATION",
            }).sort({ createdAt: -1 });
            console.log("7. pending order lookup completed", pending && pending._id);

            if (!pending) {
                throw new Error("No pending WhatsApp order found for this farmer.");
            }

            console.log("8. buildOrder starting for location finalization");
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
            console.log("9. buildOrder completed", order && order._id);

            console.log("10. shop lookup starting");
            const shopIds = await findShopsByService(order.serviceType);
            console.log("11. shop lookup completed", shopIds);
            eventBus.emit("new_order", { order, shopIds });

            console.log("12. pending deletion starting");
            await PendingWhatsAppOrder.deleteOne({ _id: pending._id });
            console.log("13. pending deletion completed");

            return res.status(200).json({
                success: true,
                message: "Order created successfully",
                order,
            });
        }

        console.log("14. text/voice branch entered");
        console.log("15. farmer lookup starting");
        const farmer = await findOrCreateFarmerByWhatsApp(fromNumber);
        console.log("16. farmer lookup completed", farmer && farmer._id);
        const fromText = (body.Body || body.body || "").trim();

        let transcript = fromText;
        let audioUrl = body.MediaUrl0 || body.mediaUrl0 || null;
        let source = "text";

        if (body.MediaContentType0?.startsWith("audio")) {
            console.log("17. audio branch entered");
            const mediaUrl = body.MediaUrl0 || body.mediaUrl0;

            if (!mediaUrl) {
                throw new Error("WhatsApp audio message missing MediaUrl0");
            }

            console.log("18. audio download starting");
            const filePath = await downloadAudio(mediaUrl, `${Date.now()}.ogg`);
            console.log("19. audio download completed", filePath);

            console.log("20. speechToText starting");
            transcript = await speechToText(filePath);
            console.log("21. speechToText completed", transcript);
            audioUrl = mediaUrl;
            source = "voice";
        }

        if (!transcript) {
            throw new Error("No message body or transcript found for WhatsApp request");
        }

        console.log("22. Gemini extractOrder starting");
        const aiData = await extractOrder(transcript);
        console.log("23. Gemini extractOrder completed", aiData);

        if (!aiData || !aiData.serviceType || !Array.isArray(aiData.products)) {
            throw new Error("AI did not return a valid order payload");
        }

        console.log("24. pending save starting");
        await savePendingOrder({
            farmerId: farmer._id,
            whatsappNumber: farmer.whatsappNumber,
            source,
            transcript,
            aiData: {
                ...aiData,
                deliveryDate: aiData.deliveryDate ?? aiData.requestedDate ?? null,
            },
            audioUrl,
        });
        console.log("25. pending save completed");

        console.log("26. sending response");
        return res.status(200).json({
            success: true,
            message: "Order details received. Please share your WhatsApp location to complete the order.",
        });

    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = handlewebHook;