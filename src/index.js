import { EventEmitter } from "events";
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app}from "./app.js"
import { handleNotificationSocket, getConnectedUsers } from "./sockets/notificationSocket.js";
import { Server } from "socket.io";
dotenv.config({
    path:'./.env'
})

const io = new Server();
handleNotificationSocket(io);
app.set("io", io);
app.set("connectedUsers", getConnectedUsers());

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`Server is running at port ${process.env.PORT || 8000}`)
    })
})
.catch((error)=>{
    console.log("Mongo_DB connect feild !! ", error)

})



