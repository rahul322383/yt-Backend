// import express from "express";
// import {
//   registerUser,
//   loginUser,
//   logoutUser,
//   refreshAccessToken,
//   changecurrentPassword,
//   getCurrentUser,
//   updateAccountDetails,
//   updateUserAvatar,
//   updateUserCoverImage,
//   getUserChannel,
//   getwatchHistory,
// } from "../controllers/user.controllers.js";

// import { verifyJWT } from "../middleware/auth.middleware.js";
// import { upload } from "../middleware/multer.middleware.js";
// import playlistRoutes from "./playlist.routes.js";
// // import playlistVideoRoutes from "./playlistVideo.routes.js"; // ✅ IMPORT THIS!
// import playlistRouter from "../routes/playlist.routes.js";
// import playlistVideoRoutes from "../routes/playlistVideo.routes.js";

// const router = express.Router();

// // ✅ Mount playlist routes under /api/v1/user/playlist
// router.use("/playlist", playlistRoutes);

// // ✅ Mount nested video routes under /api/v1/user/playlist/:playlistId/video
// router.use("/playlist", playlistVideoRoutes);

// // ✅ Auth routes
// router.post("/register", registerUser);
// router.post("/login", loginUser);
// router.post("/logout", verifyJWT, logoutUser);
// router.post("/refresh-token", refreshAccessToken);
// router.post("/change-password", verifyJWT, changecurrentPassword);

// // ✅ User info
// router.get("/me", verifyJWT, getCurrentUser);
// router.put("/update-account", verifyJWT, updateAccountDetails);

// // ✅ Avatar and cover uploads
// router.put("/update-avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
// router.put("/update-cover", verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// // ✅ Channel & watch history
// router.get("/channel/:username", verifyJWT, getUserChannel);
// router.get("/watch-history", verifyJWT, getwatchHistory);

// export default router;



// import express from "express";

// // Controllers
// import {
//   registerUser,
//   loginUser,
//   socialLogin,
//   logoutUser,
//   refreshAccessToken,
//   changecurrentPassword,
//   getCurrentUser,
//   updateAccountDetails,
//   updateUserAvatar,
//   updateUserCoverImage,
//   getUserChannel,
//   getwatchHistory,
// } from "../controllers/user.controllers.js";

// // Middleware
// import { upload } from '../middleware/multer.middleware.js'; // ✅ Correct path
// import { verifyJWT } from "../middleware/auth.middleware.js";
// import { addVideoToPlaylist } from "../controllers/playlist.controllers.js";
// // import { uploadOnCloudinary } from "../utils/cloudinary.js"; // ✅ Import this if you need it

// // Subroutes
// import playlistRoutes from "./playlist.routes.js";
// // import playlistVideoRoutes from "./playlistVideo.routes.js";

// const router = express.Router();

// /* ----------------------------- Playlist Routes ----------------------------- */

// // ✅ Mount playlist routes under /api/v1/users/playlist
// router.use("/playlist", playlistRoutes);

// // ✅ Mount nested playlist video routes under /api/v1/users/playlist/:playlistId/video


// /* ------------------------------ Auth Routes ------------------------------- */

// router.post(
//   "/register",
//   upload.fields([
//     { name: "avatar", maxCount: 1 },
//     { name: "coverImage", maxCount: 1 }
//   ]),
//   registerUser
// );

// router.post(
//   "/playlist/:playlistId/videos",
//   upload.single("video"),
//   addVideoToPlaylist
// );

// router.post("/login", loginUser);
// router.post("/social-login", socialLogin); // Accepts token + provider
// router.post("/logout", verifyJWT, logoutUser);
// router.post("/refresh-token", refreshAccessToken);
// router.post("/change-password", verifyJWT, changecurrentPassword);

// /* ----------------------------- User Account ------------------------------- */

// router.get("/me", verifyJWT, getCurrentUser);
// router.put("/update-account", verifyJWT, updateAccountDetails);

// router.put("/update-avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
// router.put("/update-cover", verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// /* ----------------------- Channel & Watch History -------------------------- */

// router.get("/channel/:username", verifyJWT, getUserChannel);
// router.get("/watch-history", verifyJWT, getwatchHistory);
import express from "express";


// Controllers
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgetPassword,
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
  resetPassword,
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
router.post("/reset-password/:resetToken", resetPassword);

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
