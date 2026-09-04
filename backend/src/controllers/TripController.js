const claimTripService=require("../services/claimTripService");
const eventBus=require("../events/eventBus");
const Shop=require("../models/Shop");

const claimTrip=async(req,res)=>{
    try{
        const {tripId}=req.params;
        const shop=await Shop.findOne({owner:req.user.userId || req.user.user});
        if(!shop) return res.status(403).json({success:false,message:"Shop not found"});
        const shopId=shop._id;

        const trip=await claimTripService(tripId,shopId);

            eventBus.emit("trip_claimed",{
                tripId:trip._id,
                shopId:trip.assignedShop
            })
    
        return res.status(200).json({
            success:true,
            message:"Trip claimed successfully",
            trip
        })
    }catch(error){

        if(error.message==="Trip already claimed"){
            return res.status(409).json({
                success:false,
                message:error.message
            });
        }
        
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}

module.exports=claimTrip;