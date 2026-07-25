const groupOrder=require("../services/groupingService");

const groupOrderController=async(req,res)=>{
    try{
        const {orderId}=req.params;

        const result=await groupOrder(orderId);

        res.status(200).json(result);
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
};

module.exports=groupOrderController;