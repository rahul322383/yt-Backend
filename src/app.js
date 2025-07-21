import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import compression from "compression";
import "./config/passport.js"; // Passport strategy config
import  {asyncHandler}  from "./utils/asyncHandler.js";

// Routes
import userRouter from "./routes/user.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import settingRouter from "./routes/settings.routes.js";
import emailRouter  from "./routes/email.routes.js";
import adminRouter from "./routes/admin.routes.js"; 
import authrouter from "./routes/auth.Routes.js"
import channelrouter from "./routes/channel.routes.js"
import trandingvideoRouter from "./routes/tranding.routes.js"
import NotificationModel from "./routes/notification.routes.js";
import ShortsRouter from "./routes/short.routes.js";

// import { Server as SocketIOServer } from "socket.io"; // Uncomment if using Socket.IO
// import { connectDB } from "./config/db.js"; // Uncomment if using MongoDB connection


const app = express();

// ✅ Middlewares
app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/users/tweets", tweetRouter);
app.use("/api/v1/users/subscribe", subscriptionRouter);
app.use("/api/v1/users/videos", videoRouter);// get all videos
app.use("/api/v1/user/playlist", videoRouter);
// app.use("/api/v1/users/videos", commentRouter);//comment video
app.use("/api/v1/user", likeRouter);//like video
app.use("/api/v1/user/playlist", playlistRouter);
app.use("/api/v1/users/dashboard", dashboardRouter);
app.use("/api/v1/users/analytics", analyticsRouter);
app.use("/api/v1/users", settingRouter);
app.use("/api/v1/users/comments", commentRouter);
app.use("/api/v1/users/sendemail", emailRouter);
app.use("/api/v1/admin", authrouter);
app.use("/api/v1/users", channelrouter);
app.use("/api/v1/videos", trandingvideoRouter);
app.use("/api/v1/notifications", NotificationModel);
app.use("/api/v1/users/shorts", ShortsRouter);


// ✅ Root
app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

// ✅ Fallback route
app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ✅ Global Error Handler
app.use(asyncHandler);

export { app };



// // server.js
// import express from "express";
// import http from "http";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import session from "express-session";
// import passport from "passport";
// import helmet from "helmet";
// import compression from "compression";
// import morgan from "morgan";
// import rateLimit from "express-rate-limit";
// import MongoStore from "connect-mongo";
// import dotenv from "dotenv";
// import { Server as SocketIOServer } from "socket.io";

// // Load environment variables from .env file
// dotenv.config();

// // Initialize Express app
// const app = express();

// // ---------------
// // Middlewares

// // Security and performance
// app.use(helmet());
// app.use(compression());

// // HTTP logging
// app.use(morgan("dev"));

// // CORS setup for your frontend
// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

// // Rate limiting (adjust limits as needed)
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
// });
// app.use("/api", apiLimiter);

// // Session management with MongoStore
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//       mongoUrl: process.env.MONGODB_URI, // Must be defined in your .env
//     }),
//     cookie: {
//       secure: process.env.NODE_ENV === "production",
//       httpOnly: true,
//       sameSite: "lax",
//       maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
//     },
//   })
// );

// app.use(express.json({ limit: "16kb" }));
// app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// app.use(cookieParser());
// app.use(express.static("public"));

// // Initialize Passport middleware and load your passport strategies
// app.use(passport.initialize());
// app.use(passport.session());
// import "./config/passport.js"; // Ensure this file configures your Passport strategies

// // ---------------
// // Routes
// // ---------------
// import userRouter from "./routes/user.routes.js";
// import tweetRouter from "./routes/tweet.routes.js";
// import subscriptionRouter from "./routes/subscription.routes.js";
// import videoRouter from "./routes/video.routes.js";
// import commentRouter from "./routes/comment.routes.js";
// import likeRouter from "./routes/like.routes.js";
// import playlistRouter from "./routes/playlist.routes.js";
// import dashboardRouter from "./routes/dashboard.routes.js";
// import analyticsRouter from "./routes/analytics.routes.js";
// import settingRouter from "./routes/settings.routes.js";

// app.use("/api/v1/users", userRouter);
// app.use("/api/v1/users/tweets", tweetRouter);
// app.use("/api/v1/users/subscriptions", subscriptionRouter);
// app.use("/api/v1/users/videos", videoRouter);
// app.use("/api/v1/users/comments", commentRouter);
// app.use("/api/v1/users/likes", likeRouter);
// app.use("/api/v1/users/playlists", playlistRouter);
// app.use("/api/v1/users/dashboard", dashboardRouter);
// app.use("/api/v1/users/analytics", analyticsRouter);
// app.use("/api/v1/users/settings", settingRouter);

// // Root route
// app.get("/", (req, res) => {
//   res.send("🚀 API is running...");
// });

// // Fallback route for undefined endpoints
// app.all("*", (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`,
//   });
// });

// // ---------------
// // Global Error Handler
// // ---------------
// app.use((err, req, res, next) => {
//   console.error("🔥 Global Error Handler:", err.stack || err.message);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// });

// // ---------------
// // Start Server with Socket.IO
// // ---------------
// const server = http.createServer(app);

// // Configure and initialize Socket.IO
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: "http://localhost:5173", // Your frontend URL
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// io.on("connection", (socket) => {
//   const userId = socket.handshake.query.userId;
//   console.log(`Socket connected: User ${userId}`);

//   socket.on("disconnect", () => {
//     console.log(`Socket disconnected: User ${userId}`);
//   });
// });

// // Start the server
// const PORT = process.env.PORT || 8000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// export { app };
