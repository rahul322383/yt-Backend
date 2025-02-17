import mongoose from "mongoose";
import {DB_NAME} from "../costants.js"


const connectDB = async () => {
    try{
       const connectionINstance= await mongoose.connect
       (`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\n Mongo_DB connected !!DB HOST :  ${connectionINstance.connection.host}`)
       

    } catch(error){
        console.log("MONGODB connect error :", error)
        process.exit(1)

    }
}
export default connectDB