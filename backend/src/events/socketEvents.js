const eventBus=require("./eventBus");

const setupSocketEvents=(io)=>{
    eventBus.on("new_order",order=>{
        io.emit("new_order",order);
    })
}

module.exports=setupSocketEvents;