/**
 * Centralized CORS Configuration
 * Handles allowed origins, credential sharing, methods, and security headers.
 */

const defaultOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

function getAllowedOrigins() {
    const origins = [...defaultOrigins];
    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL.trim());
    }
    if (process.env.CORS_ORIGIN) {
        const customOrigins = process.env.CORS_ORIGIN.split(",").map(o => o.trim());
        origins.push(...customOrigins);
    }
    return Array.from(new Set(origins));
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = getAllowedOrigins();
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed === "*") return true;
            return allowed === origin;
        });

        if (isAllowed || process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked: Origin ${origin} not permitted`));
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
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"]
};

module.exports = {
    corsOptions,
    getAllowedOrigins
};
