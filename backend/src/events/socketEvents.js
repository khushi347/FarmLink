const eventBus = require("./eventBus");
const socketAuth = require("../middleware/socketAuth");
const Shop = require("../models/Shop");

const setupSocketEvents = (io) => {

    // Authenticate every Socket.io connection
    io.use(socketAuth);

    // Handle client connections
    io.on("connection", async (socket) => {

        console.log("Client connected");

        // Shop connection
        if (socket.user.role === "shop") {

            const shop = await Shop.findOne({
                owner: socket.user.userId,
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

        // Admin connection
        if (socket.user.role === "admin") {

            socket.join("admin");

            console.log("Admin joined the room");
        }
    });

    eventBus.on("new_order", ({ order, shopIds }) => {

        shopIds.forEach((shopId) => {

            io.to(`shop:${shopId}`).emit(
                "new_order",
                order
            );

        });

    });

    eventBus.on("trip_created", ({ tripBlock, shopIds }) => {

        shopIds.forEach((shopId) => {

            io.to(`shop:${shopId}`).emit(
                "trip_created",
                tripBlock
            );

        });

        io.to("admin").emit(
            "trip_created",
            tripBlock
        );

    });

    eventBus.on("trip_claimed", ({ tripId, shopId }) => {

        // Notify the shop that successfully claimed it
        io.to(`shop:${shopId}`).emit(
            "trip_claimed",
            {
                tripId
            }
        );

        // Notify admin
        io.to("admin").emit(
            "trip_claimed",
            {
                tripId,
                shopId
            }
        );

    });

    eventBus.on("trip_completed", ({ tripId, shopId }) => {

        // Notify the assigned shop
        io.to(`shop:${shopId}`).emit(
            "trip_completed",
            {
                tripId
            }
        );

        // Notify admin
        io.to("admin").emit(
            "trip_completed",
            {
                tripId,
                shopId
            }
        );

    });

};

module.exports = setupSocketEvents;