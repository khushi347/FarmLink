const express=require("express");
const cors=require("cors");
const cookieParser=require("cookie-parser");

const app=express();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors());

const authRoutes=require("./routes/authRoutes");
const adminControllerRoutes=require("./routes/adminControllerRoutes")

app.use("/api/auth",authRoutes)
app.use("/api/admin",adminControllerRoutes)

module.exports=app;