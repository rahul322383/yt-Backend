import express from "express";
import {
  createPlaylist,
  getPlaylistById,
  getPlaylistsByUser,
  // addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
} from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);


// Get a single playlist by ID
router.get("/:playlistId", getPlaylistById);

// Get all playlists of the current user
router.get("/", getPlaylistsByUser);




// Create a new playlist
router.post("/", createPlaylist);




// Get a single playlist by ID
router.post("/:playlistId", getPlaylistById);


// Update playlist details
router.put("/:playlistId", updatePlaylist);

// Delete a playlist
router.delete("/:playlistId", deletePlaylist);

// ✅ Add a video to a playlist (corrected path)
// router.post(
//   "/:playlistId/videos",
//   upload.fields([{ name: "video", maxCount: 1 }]),
//   addVideoToPlaylist
// );

// Remove a video from a playlist
router.delete("/:playlistId/videos/:videoId", removeVideoFromPlaylist);


export default router;
