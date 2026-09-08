const Shop=require("../models/Shop");

const findShopsByService=async(serviceType)=>{
    const relevantShops=await Shop.find({
        category:serviceType,
        isActive: { $ne: false }
    }).select("_id");

    return relevantShops.map(shop=>shop._id);
}

module.exports=findShopsByService;