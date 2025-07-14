import express from "express";
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  playVideoById,
  getAndTrackVideo,
  likeVideos  // likeVideos is not used in this file, but it can be imported if needed
} from "../controllers/video.controllers.js";


import { verifyJWT } from "../middleware/auth.middleware.js";


const router = express.Router();

// 🔓 PUBLIC ROUTES FIRST
router.get("/videos/:videoId",verifyJWT, getVideoById);              // Public
router.get("/videos/:videoId/watch", getAndTrackVideo);    // Public
router.get("/play/:videoId", playVideoById);
router.post("/like/:videoId", likeVideos);

// 🔒 PROTECTED ROUTES BELOW THIS LINE



router.use(verifyJWT);

router.get("/", getAllVideos);

// 🔹 Upload video
// router.post("/:playlistId/videos", upload.fields([{ name: "video", maxCount: 1 }]), publishAVideo);


router.put("/videos/update/:videoId", updateVideo);
router.delete("/videos/:videoId", deleteVideo);
router.patch("/publish/:videoId", togglePublishStatus);

export default router;
