import express from "express";
import {
  likeVideo,
  dislikeVideo,
  likeComment,
  dislikeComment,
  likeTweet,
  dislikeTweet,
  getLikedVideos,
  getVideoLikeCount,
  toggleVideoLike,
  getAdminLikeStats,
} from "../controllers/like.controllers.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { optionalJWT } from "../middleware/optionaljwt.js";

const router = express.Router();
router.get("/videos/:videoId/like-count", getVideoLikeCount);

// ✅ All routes below require token
router.use(verifyJWT);


// ✅ PUBLIC ROUTE – accessible without token

router.post("/videos/:videoId/toggle-like",verifyJWT,toggleVideoLike);
router.get("/videos/liked-videos",verifyJWT, getLikedVideos);






router.post("/tweets/:tweetId/like", likeTweet);
router.delete("/tweets/:tweetId/like", dislikeTweet);


router.get("/admin/like-stats", getAdminLikeStats);

export default router;
