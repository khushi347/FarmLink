const mongoose = require("mongoose");

const pendingWhatsAppOrderSchema = new mongoose.Schema(
    {
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Farmer",
            required: true,
        },

        whatsappNumber: {
            type: String,
            required: true,
            trim: true,
        },

        source: {
            type: String,
            enum: ["text", "voice"],
            required: true,
        },

        transcript: {
            type: String,
            default: "",
        },

        aiData: {
            type: Object,
            required: true,
        },

        language: {
            type: String,
            required: true,
            trim: true,
            default: "English",
        },

        audioUrl: {
            type: String,
            default: null,
        },

        status: {
            type: String,
            enum: ["WAITING_FOR_LOCATION"],
            default: "WAITING_FOR_LOCATION",
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

pendingWhatsAppOrderSchema.index(
    { farmer: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: "WAITING_FOR_LOCATION",
        },
    }
);

const PendingWhatsAppOrder = mongoose.model(
    "PendingWhatsAppOrder",
    pendingWhatsAppOrderSchema
);

module.exports = PendingWhatsAppOrder;
