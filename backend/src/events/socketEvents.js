const eventBus = require("./eventBus");
const socketAuth = require("../middleware/socketAuth");
const Shop = require("../models/Shop");
const crypto = require("crypto");
const demoController = require("../controllers/demoController");

const setupSocketEvents = (io) => {
    // Give demoController access to the io instance for emitting demo:* events
    demoController.setIo(io);

    // Authenticate every Socket.io connection
    io.use(socketAuth);

    // Handle client connections
    io.on("connection", async (socket) => {
        console.log("Client connected", socket.user?.role);

        // Shop connection
        if (socket.user && socket.user.role === "shopkeeper") {
            const shop = await Shop.findOne({
                owner: socket.user.userId || socket.user.user,
            });

            if (!shop) {
                console.log("Shop not found for socket shopkeeper");
                return;
            }

            socket.join(`shop:${shop._id}`);

            if (shop.isDemo || socket.user.isDemo) {
                socket.join("demo_shopkeepers");
                console.log(`Demo Shop joined rooms: demo_shopkeepers and shop:${shop._id}`);
            } else {
                socket.join("real_shopkeepers");
                console.log(`Real Shop joined rooms: real_shopkeepers and shop:${shop._id}`);
            }
        }

        // Demo visitor connection — join session-scoped room
        if (socket.user && socket.user.role === "demo" && socket.user.sessionId) {
            socket.join(`demo:${socket.user.sessionId}`);
            console.log(`Demo visitor joined room: demo:${socket.user.sessionId}`);
        }

        // Admin connection
        if (socket.user && socket.user.role === "admin") {
            socket.join("admin");
            console.log("Admin joined the room");
        }
    });

    eventBus.on("new_order", ({ order, shopIds }) => {
        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            order,
            isDemo: !!order.isDemo,
        };

        if (order.isDemo) {
            io.to("demo_shopkeepers").emit("new_order", payload);
        } else if (shopIds && Array.isArray(shopIds)) {
            shopIds.forEach((shopId) => {
                io.to(`shop:${shopId}`).emit("new_order", payload);
            });
        }
    });

    eventBus.on("trip_created", ({ tripBlock, shopIds }) => {
        const isDemo = tripBlock.isDemo;
        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripBlock,
            isDemo: !!isDemo,
        };

        if (isDemo) {
            io.to("demo_shopkeepers").emit("trip_created", payload);
        } else {
            if (shopIds && Array.isArray(shopIds)) {
                shopIds.forEach((shopId) => {
                    io.to(`shop:${shopId}`).emit("trip_created", payload);
                });
            }
            io.to("admin").emit("trip_created", payload);
        }
    });

    eventBus.on("trip_claimed", ({ tripId, shopId, isDemo }) => {
        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripId,
            shopId,
            isDemo: !!isDemo,
        };

        // Notify the shop that successfully claimed it
        io.to(`shop:${shopId}`).emit("trip_claimed", payload);

        if (isDemo) {
            // Broadcast to all demo shopkeeper connections so they know the trip is no longer available
            io.to("demo_shopkeepers").emit("trip_claimed", payload);
        } else {
            io.to("admin").emit("trip_claimed", payload);
        }
    });

    eventBus.on("trip_completed", ({ tripId, shopId, isDemo }) => {
        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripId,
            shopId,
            isDemo: !!isDemo,
        };

        // Notify the assigned shop
        io.to(`shop:${shopId}`).emit("trip_completed", payload);

        if (isDemo) {
            io.to("demo_shopkeepers").emit("trip_completed", payload);
        } else {
            io.to("admin").emit("trip_completed", payload);
        }
    });
};

module.exports = setupSocketEvents;