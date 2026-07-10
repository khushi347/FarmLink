const mongoose=require("mongoose");

const farmerSchema=new mongoose.Schema({
    name:{
        type:String,
        trim:true,
        maxlength:50,
        default:""
    },

    whatsappNumber:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },

    language:{
        type:String,
        default:"Hindi"
    }
},
{
    timestamps:true
})

const Farmer=new mongoose.model("Farmer",farmerSchema);
module.exports=Farmer;