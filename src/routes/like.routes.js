// import express from "express";
// import { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos } from "../controllers/like.controllers.js";
// import { verifyJWT } from "../middleware/auth.middleware.js";

// const router = express.Router();

// // All routes are protected by JWT
// router.use(verifyJWT);

// // Toggle like for video, comment, and tweet
// router.post("/:videoId/like", toggleVideoLike);
// router.post("/:videoId/dislike", toggleVideoLike);
// router.post("/comment/:commentId/like", toggleCommentLike);
// router.post("/tweet/:tweetId/like", toggleTweetLike);

// // Get all liked videos by user with pagination
// router.get("/liked-videos", getLikedVideos);

// export default router;




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
// import User from "../middleware/user.middleware.js";

const router = express.Router();

// ✅ All routes are protected by JWT
router.use(verifyJWT);

// ✅ Like/Dislike routes for Video
router.post("/:videoId/like", likeVideo);
router.delete("/:videoId/like", dislikeVideo);

// ✅ Like/Dislike routes for Comment
router.post("/comments/:commentId/like", likeComment);
router.delete("/comments/:commentId/like", dislikeComment);

// ✅ Like/Dislike routes for Tweet
router.post("/tweets/:tweetId/like", likeTweet);
router.delete("/tweets/:tweetId/like", dislikeTweet);

// ✅ Get all liked videos by user with pagination
router.get("/liked-videos", getLikedVideos);


router.get("/video/:videoId/like-count", getVideoLikeCount);
router.post("/video/:videoId/toggle-like", verifyJWT, toggleVideoLike);
router.get("/admin/like-stats", verifyJWT,  getAdminLikeStats);



export default router;
