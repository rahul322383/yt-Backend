
import express from "express";
import {
  addComment,
  getVideoComments,
  updateComment,
  deleteComment,
  toggleLikeComment,
  replyToComment,
  reportComment,
  blockUser,
  getReportedComments
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";


const router = express.Router();

// 👇 Routes start here

// ✅ Add a comment to a video
router.post("/:videoId",verifyJWT, addComment);

// 📄 Get all comments for a video (public)
router.get("/:videoId", getVideoComments);

// ✏️ Update a comment
router.patch("/:commentId",verifyJWT,  updateComment);

// ❌ Soft delete a comment
router.delete("/:commentId",verifyJWT, deleteComment);

// ❤️ Like/unlike a comment
router.post("/:commentId/like",verifyJWT,  toggleLikeComment);

// 💬 Reply to a comment
router.post("/:commentId/reply",verifyJWT, replyToComment);

// 🚫 Report a comment
router.post("/:commentId/report", verifyJWT, reportComment);

// 🚫 Block a user
router.post("/:userId/block", verifyJWT, blockUser);

// Optional: Add more routes for features like pinning comments, hiding comments, etc.
router.get("/reported", verifyJWT, getReportedComments);

export default router;
