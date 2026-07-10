const mongoose=require("mongoose");

const orderSchema=new mongoose.Schema({
    farmer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Farmer",
        required:true
    },

    service:{
        type:String,
        enum:[
            "Seeds",
            "Fertilizer",
            "Pesticides",
            "Tractor Rental",
            "Water Tanker",
            "Machinery"
        ],
        required:true
    },

    quantity:{
        type:Number,
        required:true,
        min:1,
    },

    unit:{
        type:String,
        required:true,
        trim:true
    },

    location:{
        type:{
            type:String,
            enum:["Point"],
            default:"Point",
            required:true,
        },
        coordinates:{
            type:[Number],
            required:true,
        },
    },

    requestedDate:{
        type:Date,
        required:true,
    },

    assignedShop:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Shop",
        default:null,
    },

    status:{
        type:String,
        enum:[
            "Pending",
            "Accepted",
            "Completed",
            "Cancelled"
        ],
        default:"Pending"
    },

    voiceTranscript:{
        type:String,
        trim:true,
    },
},
{
    timestamps:true
})

orderSchema.index({location:"2dsphere"});
const Order=mongoose.model("Order",orderSchema);
module.exports=Order;