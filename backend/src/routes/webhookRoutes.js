const express=require("express");
const router=express.Router();

const handlewebHook=require("../controllers/handlewebHook");

router.post("/twilio",handlewebHook);

module.exports=router;