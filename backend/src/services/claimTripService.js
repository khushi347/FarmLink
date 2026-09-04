const TripBlock=require("../models/TripBlock");
const Order=require("../models/Order");

const claimTripService=async(tripId,shopId)=>{
    const claim=await TripBlock.findOneAndUpdate(
        {
            _id:tripId,
            status:"OPEN"
        },

        {
            status:"CLAIMED",
            assignedShop:shopId,
            claimedAt:new Date()
        },

        {
            new:true
        }
    )

    if(!claim){
       throw new Error("Trip already claimed")
    }

    await Order.updateMany(
        { _id: { $in: claim.orders } },
        { $set: { status: "Accepted", assignedShop: shopId } }
    );

    return claim;

}

module.exports=claimTripService;