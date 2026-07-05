const mongoose = require("mongoose");

const connectDB = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to Database");
    }catch(error){
        console.error(error);
        console.error("Cannot connect to Database");
        process.exit(1);
    }
}

module.exports=connectDB;