const User=require("../models/User")

const createShopkeeper=async(req,res)=>{
    try{
        const {name,email,password}=req.body;

        if(!name || !email || !password){
            return res.status(400).json({
                message:"All fields are required"
            })
        }

        const existingUser=await User.findOne({
            email:email
        })

        if(existingUser){
            return res.status(401).json({
                message:"User already exists"
            })
        }

        const user=await User.create({
            name,
            email,
            password,
            role:"shopkeeper"
        })

        return res.status(201).json({
            message:"Shopkeeper created successfully",
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                role:user.role
            }
        })
    }catch(error){
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

module.exports=createShopkeeper;