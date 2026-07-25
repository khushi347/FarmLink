const TripBlock=require("../models/TripBlock");

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

    return claim;

}

module.exports=claimTripService;