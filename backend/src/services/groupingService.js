const Order=require("../models/Order");
const TripBlock=require("../models/TripBlock");

    const DELIVERY_WINDOW=5*60*60*1000;
    function filterByDeliveryWindow(currentOrder,nearbyOrders){
        return nearbyOrders.filter((order)=>{
            const currentTime=new Date(currentOrder.requestedDate).getTime();
            const orderTime=new Date(order.requestedDate).getTime();

            const difference=Math.abs(currentTime-orderTime);

            return difference<=DELIVERY_WINDOW;
        })
    }

    function calculateCenterLocation(orders){
        let totalLongitude=0;
        let totalLatitude=0;

        for (const order of orders){
            totalLongitude+=order.location.coordinates[0];
            totalLatitude+=order.location.coordinates[1];
        }

        return{
            type:"Point",
            coordinates:[
                totalLongitude/orders.length,
                totalLatitude/orders.length
            ],
        };
    }

const groupOrder=async(orderId)=>{
    try{
    const currentOrder=await Order.findById(orderId);

    if(!currentOrder){
        throw new Error("Order not found");
    }

    if (currentOrder.status !== "Pending") {
    return {
        success: false,
        message: "Order is already grouped or processed.",
    };
    }
    const nearbyOrders=await Order.find({
        _id:{$ne:currentOrder._id},

        status:"Pending",

        serviceType:currentOrder.serviceType,

        location:{
            $near:{
                $geometry:{
                    type:"Point",
                    coordinates:currentOrder.location.coordinates,
                },
                $maxDistance:10000
            },
        },
    });

    const compatibleOrders=filterByDeliveryWindow(currentOrder,nearbyOrders);

    const ordersToGroup=[currentOrder,
                         ...compatibleOrders];
 
    const centerLocation=calculateCenterLocation(ordersToGroup)
    
    const tripBlock=await TripBlock.create({
        orders:ordersToGroup.map((order)=>order._id),
        serviceType:currentOrder.serviceType,
        scheduledDate:currentOrder.requestedDate,
        centerLocation,
        status:"Pending"
    })

    await Order.updateMany(
        {
            _id:{
                $in:ordersToGroup.map((order)=>order._id),
            },
        },
        {
            $set:{
                status:"Grouped",
                tripBlock:tripBlock._id
            },
        }
    )

    return{
        success:true,
        tripBlock
    }
    }catch(error){
    throw error;
}
}

module.exports=groupOrder;