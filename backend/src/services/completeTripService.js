const TripBlock=require("../models/TripBlock");
const Order=require("../models/Order");

const completeTripService=async(tripId,shopId)=>{

        const trip=await TripBlock.findOneAndUpdate({
        _id:tripId,
        status:"CLAIMED",
        assignedShop:shopId
    },{
        status:"COMPLETED",
        completedAt:new Date()
    },{
        new:true
    })

    if(!trip){
        throw new Error("Trip not assigned");
    };    

    await Order.updateMany(
        { _id: { $in: trip.orders } },
        { $set: { status: "Completed" } }
    );

    return trip;
}

module.exports = completeTripService;