const express=require("express");
const router=express.Router();

const auth=require("../middleware/authMiddleware")
const authorize=require("../middleware/roleMiddleware")

const createShopkeeper=require("../controllers/adminController")

router.post("/shopkeepers",auth,authorize("admin"),createShopkeeper);

module.exports=router;