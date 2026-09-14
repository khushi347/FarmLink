/**
 * ProcessedWebhook Model
 * Provides atomic deduplication and idempotency for external webhooks (Twilio WhatsApp).
 * Automatically purges records via a 24-hour TTL index.
 */

const mongoose = require("mongoose");

const processedWebhookSchema = new mongoose.Schema(
    {
        messageSid: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },
        status: {
            type: String,
            enum: ["PROCESSING", "COMPLETED", "FAILED"],
            default: "PROCESSING",
            index: true
        },
        source: {
            type: String,
            default: "twilio_whatsapp"
        },
        responseXml: {
            type: String,
            default: ""
        },
        errorMessage: {
            type: String,
            default: ""
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 86400 // 24 hours in seconds
        }
    },
    {
        timestamps: true
    }
);

const ProcessedWebhook = mongoose.model("ProcessedWebhook", processedWebhookSchema);

module.exports = ProcessedWebhook;
