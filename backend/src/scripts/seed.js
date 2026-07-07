const mongoose=require("mongoose");
require ("dotenv").config();

const connectDB=require("../config/db");
const seedAdmin=require("../seed/seedAdmin");

const runSeeder=async()=>{
    try{
        await connectDB();
        await seedAdmin();
        await mongoose.connection.close();
        console.log("Database connection closed");
        process.exit(0);
    }catch(error){
        console.error(error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

runSeeder();