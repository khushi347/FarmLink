const eventBus=require("./eventBus");
const socketAuth=require("../middleware/socketAuth");
const Shop=require("../models/Shop");

const setupSocketEvents=(io)=>{
    io.use(socketAuth);

    io.on("connection",async (socket)=>{
        console.log("Client connected");

        if(socket.user.role==="shop"){
        const shop=await Shop.findOne({
            owner:socket.user.userId,
        })

        if(!shop){
            console.log("Shop not found");
            return;
        }

        socket.join(`shop:${shop._id}`);

        console.log(`Shop joined the room: shop:${shop._id}`);
    }

    if (socket.user.role === "admin") {
        socket.join("admin");

        console.log("Admin joined the room");
    }

    })

    eventBus.on("new_order",({order,shopIds})=>{
        shopIds.forEach((shopId)=>{
            io.to(`shop:${shopId}`).emit("new_order", order);
        })
    })

    eventBus.on("trip_created", ({ tripBlock, shopIds }) => {

    shopIds.forEach((shopId) => {
        io.to(`shop:${shopId}`).emit("trip_created", tripBlock);
    });

    io.to("admin").emit("trip_created", tripBlock);
    });


}
module.exports=setupSocketEvents;