/**
 * Centralized CORS Configuration
 * Handles allowed origins, credential sharing, methods, and security headers.
 */

const { logger } = require("../utils/logger");

const defaultOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

function normalizeOrigin(urlStr) {
    if (!urlStr || typeof urlStr !== "string") return "";
    let clean = urlStr.trim().replace(/^["']|["']$/g, "");
    clean = clean.replace(/\/+$/, "");
    try {
        const parsed = new URL(clean);
        return parsed.origin;
    } catch {
        return clean;
    }
}

function getAllowedOrigins() {
    const rawList = [...defaultOrigins];
    if (process.env.FRONTEND_URL) {
        rawList.push(...process.env.FRONTEND_URL.split(","));
    }
    if (process.env.CORS_ORIGIN) {
        rawList.push(...process.env.CORS_ORIGIN.split(","));
    }
    const normalized = rawList
        .map(o => normalizeOrigin(o))
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        const allowedOrigins = getAllowedOrigins();

        const isAllowed = allowedOrigins.some(allowed => {
            return allowed === normalizedOrigin || allowed.toLowerCase() === normalizedOrigin.toLowerCase();
        });

        if (isAllowed || process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }

        logger.warn(`[CORS] Blocked origin: ${origin} (Normalized: ${normalizedOrigin}). Allowed origins: ${allowedOrigins.join(", ")}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Idempotency-Key",
        "X-Twilio-Signature"
    ],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"],
    optionsSuccessStatus: 204
};

module.exports = {
    corsOptions,
    getAllowedOrigins,
    normalizeOrigin
};
