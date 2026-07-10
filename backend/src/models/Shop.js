const mongoose=require("mongoose");

const shopSchema=new mongoose.Schema({
    shopName:{
        type:String,
        trim:true,
        required:true
    },

    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    category:[{
        type:String,
        enum:[
            "Seeds",
            "Fertilizer",
            "Pesticides",
            "Tractor Rental",
            "Water Tanker",
            "Machinery"
        ]
    }],

    phone:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },

    village:{
        type:String,
        required:true,
        trim:true
    },

    location:{
        type:{
            type:String,
            enum:["Point"],
            default:"Point",
            required:true
        },
        coordinates:{
            type:[Number],
            required:true
        },
    }
},
{
    timestamps:true,
})

shopSchema.index({location:"2dsphere"})
const Shop=mongoose.model("Shop",shopSchema)
module.exports=Shop;