const path = require("path");
const http=require("http");
const { Server}=require("socket.io");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = require("./app");
const connectDB=require("./config/db")
const setupSocketEvents=require("./events/socketEvents");

const PORT=process.env.PORT || 5000;

const startServer=async()=>{
    try{
        await connectDB();

        const server=http.createServer(app);
        
        const io=new Server(server);
        setupSocketEvents(io);

        io.on("connection",(socket)=>{
            console.log("Client connected");
        })

        server.listen(PORT,()=>{
            console.log(`Server is running on port ${PORT}`);
        });
    }

    catch(error){
        console.error("Failed to start server");
        console.error(error);
        process.exit(1);
    }
};

startServer();