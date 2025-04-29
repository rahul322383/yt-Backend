// routes/video.routes.js
import express from "express";
import { getTrendingVideos } from "../controllers/tranding.controllers.js";

const trandingrouter = express.Router();

// Public route
trandingrouter.get("/trending", getTrendingVideos);

export default trandingrouter;
