/**
 * Centralized Error Handling Middleware & Custom AppError
 * Catches Mongoose, JWT, validation, and operational errors, ensuring uniform JSON responses.
 */

const { logger } = require("../utils/logger");

class AppError extends Error {
    constructor(message, statusCode = 500, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found catch-all middleware for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404);
    next(error);
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    let message = err.message || "Internal server error";

    // Handle Mongoose CastError (e.g. invalid ObjectId)
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ID format for parameter: ${err.path || "id"}`;
    }

    // Handle Mongoose ValidationError
    if (err.name === "ValidationError" && err.errors) {
        statusCode = 400;
        const messages = Object.values(err.errors).map(e => e.message);
        message = `Validation failed: ${messages.join(", ")}`;
    }

    // Handle MongoDB Duplicate Key (code 11000)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `A record with this ${field} already exists.`;
    }

    // Handle JWT Errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token. Please authenticate again.";
    } else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired. Please log in again.";
    }

    // Structured logging
    if (statusCode >= 500) {
        logger.error(`[500 Server Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
            stack: err.stack,
            body: req.body
        });
    } else {
        logger.warn(`[${statusCode} Client Error] ${req.method} ${req.originalUrl}: ${message}`);
    }

    return res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
};

module.exports = {
    AppError,
    notFoundHandler,
    errorHandler
};
