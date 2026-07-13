const downloadMedia=require("../services/twilioService")

const handlewebHook=async(req,res)=>{
    try{
        console.log(req.body);
        if(req.body.MediaContentType0?.startsWith("audio")){
            const mediaUrl=req.body.MediaUrl0;

            const filePath=await downloadMedia(
                mediaUrl,
                `${Date.now()}.ogg`
            );

            console.log("Voice saved at:",filePath)
        }

        res.sendStatus(200);
    }catch(error){
        console.error(error);
        res.sendStatus(500);
    }
}

module.exports=handlewebHook;