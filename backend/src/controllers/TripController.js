const claimTripService=require("../services/claimTripService");

const claimTrip=async(req,res)=>{
    try{
        const {tripId}=req.params;
        const {shopId}=req.body;

        const trip=await claimTripService(tripId,shopId);

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