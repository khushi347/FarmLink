/**
 * Centralized Structured Logger Utility
 * Provides log levels, timestamping, request middleware, and automatic sensitive data redaction.
 */

const SENSITIVE_KEYS = [
    "password",
    "token",
    "refreshtoken",
    "authorization",
    "cookie",
    "secret",
    "apikey",
    "jwt_secret",
    "jwt_refresh_secret",
    "twilio_auth_token"
];

function redactSensitiveData(data) {
    if (!data || typeof data !== "object") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => redactSensitiveData(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
            sanitized[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = redactSensitiveData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

function formatLog(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta !== undefined ? ` ${JSON.stringify(redactSensitiveData(meta))}` : "";
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
}

const logger = {
    info: (message, meta) => {
        console.log(formatLog("INFO", message, meta));
    },
    warn: (message, meta) => {
        console.warn(formatLog("WARN", message, meta));
    },
    error: (message, meta) => {
        console.error(formatLog("ERROR", message, meta));
    },
    debug: (message, meta) => {
        if (process.env.NODE_ENV !== "production" || process.env.LOG_LEVEL === "debug") {
            console.debug(formatLog("DEBUG", message, meta));
        }
    },
    redact: redactSensitiveData
};

/**
 * Express middleware for structured HTTP request logging
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const level = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";
        const message = `${req.method} ${req.originalUrl} ${statusCode} - ${duration}ms [IP: ${req.ip || req.socket.remoteAddress}]`;

        if (level === "ERROR") {
            logger.error(message);
        } else if (level === "WARN") {
            logger.warn(message);
        } else {
            logger.info(message);
        }
    });

    next();
};

module.exports = {
    logger,
    requestLogger,
    redactSensitiveData
};
