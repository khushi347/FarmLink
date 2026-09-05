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

        console.log("Client connected");

        // Shop connection
        if (socket.user.role === "shopkeeper") {

            const shop = await Shop.findOne({
                owner: socket.user.userId || socket.user.user,
            });

            if (!shop) {
                console.log("Shop not found");
                return;
            }

            socket.join(`shop:${shop._id}`);

            console.log(
                `Shop joined the room: shop:${shop._id}`
            );
        }

        // Demo visitor connection — join session-scoped room
        if (socket.user.role === "demo" && socket.user.sessionId) {
            socket.join(`demo:${socket.user.sessionId}`);
            console.log(`Demo visitor joined room: demo:${socket.user.sessionId}`);
        }

        // Admin connection
        if (socket.user.role === "admin") {

            socket.join("admin");

            console.log("Admin joined the room");
        }
    });

    eventBus.on("new_order", ({ order, shopIds }) => {

        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            order,
        };

        shopIds.forEach((shopId) => {

            io.to(`shop:${shopId}`).emit(
                "new_order",
                payload
            );

        });

    });

    eventBus.on("trip_created", ({ tripBlock, shopIds }) => {

        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripBlock,
        };

        shopIds.forEach((shopId) => {

            io.to(`shop:${shopId}`).emit(
                "trip_created",
                payload
            );

        });

        io.to("admin").emit(
            "trip_created",
            payload
        );

    });

    eventBus.on("trip_claimed", ({ tripId, shopId }) => {

        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripId,
            shopId,
        };

        // Notify the shop that successfully claimed it
        io.to(`shop:${shopId}`).emit(
            "trip_claimed",
            payload
        );

        // Notify admin
        io.to("admin").emit(
            "trip_claimed",
            payload
        );

    });

    eventBus.on("trip_completed", ({ tripId, shopId }) => {

        const payload = {
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            tripId,
            shopId,
        };

        // Notify the assigned shop
        io.to(`shop:${shopId}`).emit(
            "trip_completed",
            payload
        );

        // Notify admin
        io.to("admin").emit(
            "trip_completed",
            payload
        );

    });

};

module.exports = setupSocketEvents;