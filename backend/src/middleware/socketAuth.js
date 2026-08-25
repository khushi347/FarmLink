const jwt=require("jsonwebtoken");

const socketAuth=(socket,next)=>{
    const token=socket.handshake.auth.token;

    if(!token){
        return next(new Error("Authentication required"));
    }

    try{    
        const decoded=jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.user=decoded;

        next();
    }catch(error){
        next(new Error("Invalid or expired token"))
    }
}

module.exports=socketAuth;