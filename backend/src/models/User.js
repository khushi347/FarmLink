const mongoose=require("mongoose");
const bcrypt=require("bcryptjs");

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },

    email:{
        type:String,
        unique:true,
        required:true,
        trim:true,
        lowercase:true
    },

    password:{
        type:String,
        required:true,
        minlength:8
    },

    role:{
        type:String,
        enum:[
            "admin",
            "shopkeeper"
        ],
        default:"shopkeeper"
    },

    refreshToken:{
        type:String,
        default:""
    }
},
{
timestamps:true
}
)

userSchema.pre("save",async function (next){
    if(!this.isModified("password")){
        return;
    }

    this.password=await bcrypt.hash(
        this.password,
        10
    );
})
const User=mongoose.model("User",userSchema)
module.exports=User;