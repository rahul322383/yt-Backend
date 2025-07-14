
import express from 'express';
import { verifyJWT} from '../middleware/auth.middleware.js';
import {
    createVideo,
    updateVideo,
    deleteVideo,
    getVideo,
    addView,
    random,
    trend,
    getByTag,
    search,
    getAllVideos,
    likeVideo
} from '../controllers/shortsControllers.js';
import { upload } from "../middleware/multer.middleware.js";; // Assuming you have a middleware for file uploads

const router = express.Router();


// Routes for short videos (shorts)
router.get("/all", getAllVideos);

// Create a video
router.post("/upload", verifyJWT, upload.single("video"), createVideo);

// Update video
router.put("/:id",  verifyJWT, updateVideo);

// like/dislike video
router.post("/like/:id", likeVideo);

// Delete video
router.delete("/:id", verifyJWT, deleteVideo);

// Get video
router.get("/:id", verifyJWT, getVideo);

// View count
router.put("/:id",  verifyJWT, addView);

// Random videos
router.get("/random",  random);

// Trending videos
router.get("/trend",  trend);

// Videos by tags
router.get("/tags", getByTag);

// Search videos
router.get("/search",   search);

export default router;