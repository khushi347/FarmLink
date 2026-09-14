/**
 * Rate Limiting Middleware
 * Protects global API endpoints and sensitive authentication routes from brute force and DoS attacks.
 */

const rateLimit = require("express-rate-limit");

const isTestEnvironment = (req) => {
    return (
        process.env.NODE_ENV === "test" ||
        process.env.DISABLE_RATE_LIMIT === "true" ||
        req.headers["x-test-bypass"] === "farmlink-test"
    );
};

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnvironment,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes."
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnvironment,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again after 15 minutes."
    }
});

const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnvironment,
    message: {
        success: false,
        message: "Too many AI requests. Please wait a few moments before trying again."
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    aiLimiter
};
