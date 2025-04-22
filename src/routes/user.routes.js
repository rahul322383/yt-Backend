
import express from "express";
// Controllers
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  // forgotPassword,
  verifyOtp,
  changecurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannel,
  getwatchHistory,
} from "../controllers/user.controllers.js";

import {
  handleOAuthCallback,
  forgotPassword,
  // resetPassword,
} from "../controllers/authController.js"; // ✅ Add auth controller

// Middleware
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

// Playlist controller (for direct video upload)
import { addVideoToPlaylist } from "../controllers/playlist.controllers.js";

// Subroutes
import playlistRoutes from "./playlist.routes.js";

const router = express.Router();

/* ------------------------ Nested Playlist Routes ------------------------ */
router.use("/playlist", playlistRoutes);

/* ----------------------------- Auth Routes ------------------------------ */

// 👤 Register (email + social login) with avatar/cover support
router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

// 🔐 Login / Logout / Token Management
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWT, changecurrentPassword);

// 🔁 Forgot/Reset Password
router.post("/forget-password", forgotPassword);
router.post('/verify-email', verifyOtp); 
// router.post("/reset-password/:resetToken", resetPassword);

// 🔑 OAuth Success Redirect
router.get("/auth/callback", handleOAuthCallback);

/* --------------------------- User Operations ---------------------------- */

router.get("/me", verifyJWT, getCurrentUser);
router.put("/update-account", verifyJWT, updateAccountDetails);
router.put("/update-avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
router.put("/update-cover", verifyJWT, upload.single("coverImage"), updateUserCoverImage);

/* -------------------- Channel & Watch History Routes -------------------- */

router.get("/channel/:username", verifyJWT, getUserChannel);
router.get("/:username/:channelId", verifyJWT, getUserChannel);
router.get("/watch-history", verifyJWT, getwatchHistory);

/* ---------------------- Playlist Video Upload Route --------------------- */
// ⚠️ If needed separately (outside playlist.routes)
router.post("/playlist/:playlistId/videos", upload.single("video"), addVideoToPlaylist);

export default router;
