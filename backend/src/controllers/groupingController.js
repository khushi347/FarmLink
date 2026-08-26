const groupOrder=require("../services/groupingService");
const eventBus=require("../events/eventBus");
const findShopsByService=require("../services/shopService");

const groupOrderController=async(req,res)=>{
    try{
        const {orderId}=req.params;

        const result=await groupOrder(orderId);

        if(result.success){
            const {serviceType}=result.tripBlock;
            const shopIds=await findShopsByService(serviceType);

            eventBus.emit("trip_created",{
                tripBlock:result.tripBlock,
                shopIds
            })
        }

        res.status(200).json(result);
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
};

module.exports=groupOrderController;