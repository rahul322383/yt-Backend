import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true,limit: "16kb"}))//for url encoded data
app.use(express.static("public"))
app.use(cookieParser())

// routes import
import userRouter from "./routes/user.routes.js"

app.use("/api/v1/users",userRouter)

/*app.get("/api/message", (req, res) => {
    res.json({ message: "Hello from the backend!" });
});

app.listen(8000, () => {
    console.log("Server running on http://localhost:8000");
})  */




export {app}
