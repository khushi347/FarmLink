/**
 * Environment Configuration & Validation Module
 * Validates mandatory environment variables at startup and masks sensitive variables.
 */

const path = require("path");

const REQUIRED_ENV_VARS = [
    "PORT",
    "MONGO_URI",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET"
];

const OPTIONAL_ENV_VARS = [
    "FRONTEND_URL",
    "NODE_ENV",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_NUMBER",
    "TWILIO_VALIDATE_SIGNATURE",
    "GEMINI_API_KEY",
    "SARVAM_API_KEY",
    "RATE_LIMIT_MAX",
    "AUTH_RATE_LIMIT_MAX"
];

/**
 * Validates that all required environment variables are set and meet security baselines.
 * Throws an Error if critical variables are missing.
 */
function validateEnv() {
    const missing = [];

    for (const key of REQUIRED_ENV_VARS) {
        if (!process.env[key] || process.env[key].trim() === "") {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        const errorMsg = `[FATAL] Missing required environment variables: ${missing.join(", ")}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    // Security check: JWT secrets minimum length in production
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        if ((process.env.JWT_SECRET || "").length < 32) {
            console.warn("[SECURITY WARN] JWT_SECRET is less than 32 characters in production!");
        }
        if ((process.env.JWT_REFRESH_SECRET || "").length < 32) {
            console.warn("[SECURITY WARN] JWT_REFRESH_SECRET is less than 32 characters in production!");
        }
    }

    return true;
}

/**
 * Returns a sanitized dictionary of loaded environment variables for safe diagnostic logging.
 */
function getSanitizedConfig() {
    const config = {};
    const allKeys = [...REQUIRED_ENV_VARS, ...OPTIONAL_ENV_VARS];

    for (const key of allKeys) {
        const val = process.env[key];
        if (!val) {
            config[key] = "<not-set>";
        } else if (
            key.includes("SECRET") ||
            key.includes("PASSWORD") ||
            key.includes("AUTH_TOKEN") ||
            key.includes("API_KEY")
        ) {
            config[key] = val.length > 6 ? `${val.slice(0, 3)}***${val.slice(-3)}` : "***";
        } else if (key === "MONGO_URI") {
            config[key] = val.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
        } else {
            config[key] = val;
        }
    }

    return config;
}

module.exports = {
    validateEnv,
    getSanitizedConfig,
    REQUIRED_ENV_VARS,
    OPTIONAL_ENV_VARS
};
