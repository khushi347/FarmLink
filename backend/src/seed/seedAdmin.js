const User=require("../models/User")
require("dotenv").config();

const seedAdmin=async()=>{
    try{
        const existingAdmin=await User.findOne({
            email:process.env.ADMIN_EMAIL,
        });

        if(existingAdmin){
            console.log("Admin already exists");
            return;
        }

        await User.create({
            name:process.env.ADMIN_NAME,
            email:process.env.ADMIN_EMAIL,
            password:process.env.ADMIN_PASSWORD,
            role:"admin"
        });

        console.log("Admin created successfully");
    }catch(error){
        console.error("Error seeding admin: ",error);
        throw error;
    }
}

module.exports=seedAdmin;