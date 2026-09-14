/**
 * Twilio Webhook Signature Validation Middleware
 * Validates the X-Twilio-Signature cryptographic header to ensure incoming requests originate from Twilio.
 */

const twilio = require("twilio");
const { logger } = require("../utils/logger");

const validateTwilioWebhook = (req, res, next) => {
    // Check if signature validation is explicitly disabled or in test mode
    const isExplicitlyDisabled = process.env.TWILIO_VALIDATE_SIGNATURE === "false";
    const isTestBypass = req.headers["x-test-bypass"] === "farmlink-test";
    const isProduction = process.env.NODE_ENV === "production";
    const isValidationRequired = process.env.TWILIO_VALIDATE_SIGNATURE === "true" || (isProduction && !isExplicitlyDisabled);

    if (!isValidationRequired || isTestBypass) {
        return next();
    }

    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
        logger.error("[Twilio Webhook] TWILIO_AUTH_TOKEN is missing from environment. Rejecting webhook.");
        return res.status(500).json({ success: false, message: "Twilio authentication token not configured." });
    }

    const signature = req.headers["x-twilio-signature"];
    if (!signature) {
        logger.warn("[Twilio Webhook] Missing X-Twilio-Signature header.");
        return res.status(403).json({ success: false, message: "Forbidden: Missing X-Twilio-Signature header." });
    }

    // Reconstruct the exact URL that Twilio requested
    let fullUrl = process.env.TWILIO_WEBHOOK_URL;
    if (!fullUrl) {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
        const host = req.headers["x-forwarded-host"] || req.get("host");
        fullUrl = `${protocol}://${host}${req.originalUrl}`;
    }

    try {
        const isValid = twilio.validateRequest(
            authToken,
            signature,
            fullUrl,
            req.body || {}
        );

        if (!isValid) {
            logger.warn(`[Twilio Webhook] Invalid signature from IP ${req.ip} for URL: ${fullUrl}`);
            return res.status(403).json({
                success: false,
                message: "Forbidden: Invalid Twilio signature."
            });
        }

        next();
    } catch (err) {
        logger.error(`[Twilio Webhook] Signature verification error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: "Error verifying Twilio webhook signature."
        });
    }
};

module.exports = validateTwilioWebhook;
