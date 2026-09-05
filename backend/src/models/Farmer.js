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
    },

    isDemo:{
        type:Boolean,
        default:false,
        index:true
    },

    demoSessionId:{
        type:String,
        default:null,
        index:true
    }
},
{
    timestamps:true
})

const Farmer=new mongoose.model("Farmer",farmerSchema);
module.exports=Farmer;