import express from "express";
import { getPlaylistAnalytics } from "../controllers/analyticsController.js";

const router = express.Router();

// Analytics route
router.get("/playlists", getPlaylistAnalytics);

export default router;
