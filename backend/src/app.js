const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const { corsOptions } = require("./config/cors");
const { requestLogger } = require("./utils/logger");
const { globalLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

// 1. HTTP Security Headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// 2. CORS with Credentials & Origin Whitelist
app.use(cors(corsOptions));

// 3. Body Parsers with Explicit Size Limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// 4. Centralized Request Logger
app.use(requestLogger);

// 5. Global API Rate Limiter
app.use("/api", globalLimiter);

// 6. Realtime Event Listeners
const setupNotificationListeners = require("./events/notificationListeners");
setupNotificationListeners();

// 7. Route Handlers
const authRoutes = require("./routes/authRoutes");
const adminControllerRoutes = require("./routes/adminControllerRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const aiRoutes = require("./routes/aiRoutes");
const orderRoutes = require("./routes/orderRoutes");
const groupRoutes = require("./routes/groupingRoutes");
const claimRoutes = require("./routes/TripRoutes");
const shopRoutes = require("./routes/shopRoutes");
const mapRoutes = require("./routes/mapRoutes");
const demoRoutes = require("./routes/demoRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminControllerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/group", groupRoutes);
app.use("/api/trip-blocks", claimRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/demo", demoRoutes);

// 8. 404 Catch-All & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;