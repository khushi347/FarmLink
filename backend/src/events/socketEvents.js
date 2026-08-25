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

    })

    eventBus.on("new_order",order=>{
        io.emit("new_order",order);
    })


}
module.exports=setupSocketEvents;