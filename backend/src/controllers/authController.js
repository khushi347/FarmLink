const User=require("../models/User");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");

const login=async(req,res)=>{
    try{const {email,password}=req.body;

    if(!email || !password){
        return res.status(401).json({
            message:"All fields are required"
        })
    }

    const userDetail=await User.findOne({
        email
    })

    if(!userDetail){
        return res.status(400).json({
            "message":"Invalid email or password"
        })
    }

    const isMatched=await bcrypt.compare(
        password,
        userDetail.password
    )

    if(!isMatched){
        return res.status(401).json({
            message:"Invalid email or password"
        })
    }

        const token=jwt.sign({
            userId:userDetail._id,
            role:userDetail.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn:"15m"
        })

        const refreshToken=jwt.sign(
            {
                userId:userDetail._id
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn:"7d"
            }
        );

        userDetail.refreshToken=refreshToken;
        await userDetail.save();

        res.cookie("refreshToken",refreshToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV==="production",
            sameSite:"strict",
            maxAge:7*24*60*60*1000
        })
    

    return res.status(200).json({
        message:"Logged in successfully",
        token,
        user:{
            id:userDetail._id,
            name:userDetail.name,
            role:userDetail.role
        }
    })
    }catch(error){
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

const refresh=async(req,res)=>{
    try{
    const refreshToken=req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(401).json({
            message:"Please login again"
        })
    }

    const decoded=jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
    )

    const user=await User.findById(
        decoded.userId
    )

    if(!user){
        return res.status(401).json({
            message:"User not found"
        })
    }

    if(user.refreshToken!==refreshToken){
        return res.status(401).json({
            message:"Invalid refresh token"
        })
    }

    const accessToken=jwt.sign(
        {
            user:user._id,
            role:user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn:"15m"
        }
    )

    return res.status(200).json({
        accessToken
    })
    }catch(error){
        res.status(500).json({
            message:"Internal server error"
        })
    }
}

const logout=async(req,res)=>{
    try{
    const refreshToken=req.cookies.refreshToken;

    const user=await User.findOne({
        refreshToken
    })

    if(!user){
        return res.status(401).json({
            message:"User not found"
        })
    }

    user.refreshToken="";
    await user.save();

    res.clearCookie("refreshToken");

    return res.status(200).json({
        message:"Logged out successfully"
    })

    }catch(error){
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

module.exports={login,refresh,logout};