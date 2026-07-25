const express=require("express");
const router=express.Router();

const groupOrderController=require("../controllers/groupingController");

router.post("/:orderId",groupOrderController);

module.exports=router;