// import { Router } from "express";
// import {
//   addComment,
//   deleteComment,
//   getVideoComments,
//   updateComment,
// } from "../controllers/comment.controllers.js";
// import { verifyJWT } from "../middleware/auth.middleware.js";

// const router = Router();

// // ✅ Apply authentication to all comment routes
// router.use(verifyJWT);

// // Video-related comments (GET and POST)
// router
//   .route("/:videoId/comments")
//   .get(getVideoComments)  // Get comments on a video
//   .post(addComment);      // Add comment to a video

// // Comment-related actions (PATCH and DELETE)
// router
//   .route("/:videosId/comments/:commentId")
//   .patch(updateComment)   // Edit comment
//   .delete(deleteComment); // Delete comment

// export default router;


import express from "express";
import {
  addComment,
  getVideoComments,
  updateComment,
  deleteComment,
  toggleLikeComment,
  replyToComment,
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// 👇 Routes start here

// ✅ Add a comment to a video
router.post("/:videoId/comments", verifyJWT, addComment);

// 📄 Get all comments for a video (public)
router.get("/:videoId", getVideoComments);

// ✏️ Update a comment
router.patch("/:commentId", verifyJWT, updateComment);

// ❌ Soft delete a comment
router.delete("/:commentId", verifyJWT, deleteComment);

// ❤️ Like/unlike a comment
router.post("/:commentId/like", verifyJWT, toggleLikeComment);

// 💬 Reply to a comment
router.post("/:commentId/reply", verifyJWT, replyToComment);

export default router;
