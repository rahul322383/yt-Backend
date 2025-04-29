import express from "express";
import { getPlaylistAnalytics , getVideoAnalytics} from "../controllers/analyticsController.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// Analytics route
router.get("/playlist",verifyJWT ,getPlaylistAnalytics);

router.get("/playlist/videos",verifyJWT ,getVideoAnalytics);

export default router;
