const TripBlock=require("../models/TripBlock");
const Order=require("../models/Order");

exports.getDashboard=async(req,res)=>{
    try{
        
        const available=await TripBlock.countDocuments({
            assignedShop:null,
            status:"OPEN",
        });

        const acceptedTrips=await TripBlock.countDocuments({
            assignedShop:req.user.userId,
            status:"CLAIMED"
        });

        const completedTrips=await TripBlock.countDocuments({
            assignedShop:req.user.userId,
            status:"COMPLETED"
        });

        const totalOrders=await Order.countDocuments({
            assignedShop:req.user.userId
        })

        const trips=await TripBlock.find({
            assignedShop:req.user.userId,
            status:"COMPLETED"
        });

        let revenue=0;

        trips.forEach((trip)=>{
            revenue+=trip.estimatedEarnings;
        })

        res.status(200).json({
            success:true,
            data:{
              
                available,
                acceptedTrips,
                completedTrips,
                totalOrders,
                revenue,
            },
        });

    }catch(error){
        return res.status(500).json({
            success:false,
            error:error.message,
        });
    }
};

exports.getAvailableTrips=async(req,res)=>{
    try{
        const page=Number(req.query.page) || 1;
        const limit=Number(req.query.limit) || 10;
        const sort=req.query.sort || "-createdAt";

        const skip=(page-1)*limit;

        const {serviceType}=req.query;

        const filter={
            status:"OPEN",
            assignedShop:null
        };

        if(serviceType){
            filter.serviceType=serviceType;
        }

        const totalTrips=await TripBlock.countDocuments(filter);

        const trips=await TripBlock.find(filter)
             .skip(skip)
             .limit(limit)
             .sort(sort);

        const totalPages=Math.ceil(totalTrips/limit);

        res.status(200).json({
            success:true,
            page,
            limit,
            totalTrips,
            totalPages,
            data:trips
        });

    }catch(error){
        res.status(500).json({
            success:false,
            error:error.message
        })
    }
};

exports.getAcceptedTrips=async(req,res)=>{
    try{
        const page= Number(req.query.page) || 1;
        const limit=Number(req.query.limit) || 10;

        const skip=(page-1)*limit;
        
        const {serviceType}=req.query;

        const sort=req.query.sort || "-createdAt";

        const filter={
            status:"CLAIMED",
            assignedShop:req.user.userId
        };

        if(serviceType){
            filter.serviceType=serviceType;
        }

        const totalTrips=await TripBlock.countDocuments(filter);

        const trips=await TripBlock.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)

        const totalPages=Math.ceil(totalTrips/limit);

        res.status(200).json({
            success:true,
            page,
            limit,
            totalTrips,
            totalPages,
            data:trips
        })
    }
    catch(error){
        res.status(500).json({
            success:false,
            error:error.message
        });
    }
}


exports.getCompletedTrips=async(req,res)=>{
    try{
        const page= Number(req.query.page) || 1;
        const limit=Number(req.query.limit) || 10;

        const skip=(page-1)*limit;
        
        const {serviceType}=req.query;

        const sort=req.query.sort || "-createdAt";

        const filter={
            status:"COMPLETED",
            assignedShop:req.user.userId
        };

        if(serviceType){
            filter.serviceType=serviceType;
        }

        const totalTrips=await TripBlock.countDocuments(filter);

        const trips=await TripBlock.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)

        const totalPages=Math.ceil(totalTrips/limit);

        res.status(200).json({
            success:true,
            page,
            limit,
            totalTrips,
            totalPages,
            data:trips
        })
    }
    catch(error){
        res.status(500).json({
            success:false,
            error:error.message
        });
    }
}

exports.getOrders = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const { status, serviceType } = req.query;

        const filter = {
            assignedShop: req.user.userId
        };

        if (status) {
            filter.status = status;
        }

        if (serviceType) {
            filter.serviceType = serviceType;
        }

        const sort = req.query.sort || "-createdAt";

        const totalOrders = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        res.status(200).json({
            success: true,
            page,
            limit,
            totalOrders,
            totalPages,
            data: orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getRevenue = async (req, res) => {
    try {

        const result = await TripBlock.aggregate([
            {
                $match: {
                    assignedShop: req.user.userId,
                    status: "COMPLETED"
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$estimatedEarnings"
                    }
                }
            }
        ]);

        const totalRevenue = result[0]?.totalRevenue || 0;

        res.status(200).json({
            success: true,
            data: {
                totalRevenue
            }
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }
};