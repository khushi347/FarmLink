const mongoose=require("mongoose");

const orderSchema=new mongoose.Schema({
    farmer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Farmer",
        required:true
    },

    products: {
    type: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unit: {
            type: String,
            trim: true
        }
    }],
    required: true,
    validate: {
        validator: (products) => products.length > 0,
        message: "Order must contain at least one product."
    }
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
        type:String,
        default:null
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
            "Grouped",
            "Accepted",
            "Completed",
            "Cancelled"
        ],
        default:"Pending"
    },

    audioUrl:{
        type:String,
        required:true
    },

    transcript:{
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