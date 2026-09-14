const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { validateEnv, getSanitizedConfig } = require("./config/env");
const { logger } = require("./utils/logger");
const { corsOptions } = require("./config/cors");

// Validate environment variables immediately
try {
    validateEnv();
} catch (envErr) {
    logger.error("Environment validation failed", { error: envErr.message });
    process.exit(1);
}

const app = require("./app");
const connectDB = require("./config/db");
const setupSocketEvents = require("./events/socketEvents");

const PORT = process.env.PORT || 5000;

// Process-level exception handling
process.on("uncaughtException", (error) => {
    logger.error(`[CRITICAL] Uncaught Exception: ${error.message}`, { stack: error.stack });
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.error(`[CRITICAL] Unhandled Promise Rejection: ${reason}`);
});

const startServer = async () => {
    try {
        await connectDB();

        const server = http.createServer(app);

        const io = new Server(server, {
            cors: corsOptions
        });
        setupSocketEvents(io);

        server.listen(PORT, () => {
            logger.info(`Server is running securely on port ${PORT}`);
            logger.debug("Active environment configuration loaded", getSanitizedConfig());
        });
    } catch (error) {
        logger.error("Failed to start server", { error: error.message, stack: error.stack });
        process.exit(1);
    }
};

startServer();