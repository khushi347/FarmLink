const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("../config/db");
const seedShopkeeperDemo = require("../seed/seedShopkeeperDemo");

const run = async () => {
    try {
        await connectDB();
        await seedShopkeeperDemo();
        await mongoose.connection.close();
        console.log("Database connection closed");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

run();
