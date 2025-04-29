import express from "express";
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  playVideoById,
  getAndTrackVideo
} from "../controllers/video.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

// ✅ All routes are protected
router.use(verifyJWT);

//get all videos 
router.get("/", getAllVideos);

// 🔹 GET all videos with pagination + filtering
router.get("/", getAllVideos);

// 🔹 UPLOAD a new video
router.post("/playlists/:playlistId/videos", upload.single("videoFile"), publishAVideo);

// 🔹 GET a video by ID
router.get("/videos/:videoId", getVideoById);

// // 🔹 STREAM (play) a video by ID
router.get("/play/:videoId", playVideoById); // Changed from PATCH to GET

// 🔹 UPDATE video title/description
router.put("/videos/update/:videoId", updateVideo);

// 🔹 DELETE a video
router.delete("/videos/:videoId", deleteVideo);

// // 🔹 TOGGLE publish/unpublish status
router.patch("/publish/:videoId/", togglePublishStatus);


router.get("/videos/:videoId/watch", getAndTrackVideo);

export default router;
