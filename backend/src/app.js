const express=require("express");
const cors=require("cors");
const cookieParser=require("cookie-parser");

const app=express();
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(express.urlencoded({extended:false}));

const authRoutes=require("./routes/authRoutes");
const adminControllerRoutes=require("./routes/adminControllerRoutes")
const webhookRoutes=require("./routes/webhookRoutes")

app.use("/api/auth",authRoutes)
app.use("/api/admin",adminControllerRoutes)
app.use("/api/webhooks",webhookRoutes);

module.exports=app;