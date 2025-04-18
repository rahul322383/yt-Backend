// import { Router } from "express";
// import {
//   deleteVideo,
//   getAllVideos,
//   getVideoById,
//   publishAVideo,
//   togglePublishStatus,
//   updateVideo,
// } from "../controllers/video.controllers.js";
// import { verifyJWT } from "../middleware/auth.middleware.js";
// import { upload } from "../middleware/multer.middleware.js";

// const router = Router();

// // PUBLIC: Get all videos
// router.get("/", getAllVideos);

// // PUBLIC: Get a single video by ID
// router.get("/:videoId", getVideoById);

// // PROTECTED: Publish a video
// router.post(
//   "/",
//   verifyJWT,
//   upload.fields([
//     { name: "videoFile", maxCount: 1 },
//     { name: "thumbnail", maxCount: 1 },
//   ]),
//   publishAVideo
// );

// // PROTECTED: Update a video (with optional new thumbnail)
// router.patch("/:videoId", verifyJWT, upload.single("thumbnail"), updateVideo);

// // PROTECTED: Delete a video
// router.delete("/:videoId", verifyJWT, deleteVideo);

// // PROTECTED: Toggle publish status
// router.patch("/toggle/publish/:videoId", verifyJWT, togglePublishStatus);

// export default router;

// // src/routes/playlistVideo.routes.js


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
router.post("/videos", upload.single("videoFile"), publishAVideo);

// 🔹 GET a video by ID
router.get("/videos/:videoId", getVideoById);

// // 🔹 STREAM (play) a video by ID
router.get("/play/videos/:videoId", playVideoById); // Changed from PATCH to GET

// 🔹 UPDATE video title/description
router.put("/:videoId", updateVideo);

// 🔹 DELETE a video
router.delete("/videos/:videoId", deleteVideo);

// // 🔹 TOGGLE publish/unpublish status
router.patch("/publish/:videoId/", togglePublishStatus);


router.get("/videos/:videoId/watch", getAndTrackVideo);

export default router;
