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
  getAdminLikeStats
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";


const router = express.Router();

// ✅ All routes are protected by JWT
router.use(verifyJWT);

// ✅ Like/Dislike routes for Video
router.post("/videos/:videoId/like", likeVideo);
router.delete("/videos/:videoId/like", dislikeVideo);
router.post("/videos/:videoId/toggle-like", toggleVideoLike);
router.get("/videos/:videoId/like-count", getVideoLikeCount);

// ✅ Like/Dislike routes for Comment
router.post("/comments/:commentId/like", likeComment);
router.delete("/comments/:commentId/like", dislikeComment);

// ✅ Like/Dislike routes for Tweet
router.post("/tweets/:tweetId/like", likeTweet);
router.delete("/tweets/:tweetId/like", dislikeTweet);

// ✅ Get all liked videos by user with pagination
router.get("/videos/playlist/liked-videos", getLikedVideos);

// ✅ Admin Stats
router.get("/admin/like-stats", getAdminLikeStats);

export default router;
