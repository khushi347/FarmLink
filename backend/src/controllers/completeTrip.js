const completeTripService = require("../services/completeTripService");
const eventBus = require("../events/eventBus");

const completeTrip=async(req,res)=>{
    try{    
        const {tripId}=req.params;
        const {shopId}=req.body;

        const trip=await completeTripService(tripId,shopId);

        eventBus.emit("trip_completed", {
            tripId: trip._id,
            shopId: trip.assignedShop
        });

        return res.status(200).json({
            success: true,
            message: "Trip completed successfully",
            trip
        });


    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = completeTrip;