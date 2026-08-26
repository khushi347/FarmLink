const Shop=require("../models/Shop");

const findShopsByService=async(serviceType)=>{
    const relevantShops=await Shop.find({
        category:serviceType
    }).select("_id");

    return relevantShops.map(shop=>shop._id);
}

module.exports=findShopsByService;