import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// ✅ Apply authentication to all comment routes
router.use(verifyJWT);

// Video-related comments (GET and POST)
router
  .route("/:videoId/comments")
  .get(getVideoComments)  // Get comments on a video
  .post(addComment);      // Add comment to a video

// Comment-related actions (PATCH and DELETE)
router
  .route("/:videosId/comments/:commentId")
  .patch(updateComment)   // Edit comment
  .delete(deleteComment); // Delete comment

export default router;
