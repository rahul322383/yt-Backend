import express from "express";
import {
  adminLogin,
  adminDashboard,
  adminLogout,
  getAdminStats,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,
  getReportedComments,
  resolveReportedComment,
  blockUser,
  getAllVideos,
  getAllComments,
} from "../controllers/admin.controllers.js";

import admin from "../middleware/admin.middleware.js";

const router = express.Router();

// Auth
router.post("/login", adminLogin);
router.post("/logout", admin, adminLogout);

// Dashboard & Stats
router.get("/dashboard", admin, adminDashboard);
router.get("/stats", admin, getAdminStats);

// Users
router.get("/users", admin, getAllUsers);
router.get("/users/:id", admin, getUserById);
router.patch("/users/:id", admin, updateUser);
router.delete("/users/:id", admin, deleteUser);
router.post("/block-user/:userId", admin, blockUser);

// Videos
router.get("/videos", admin, getAllVideos);

// Comments
router.get("/reported-comments", admin, getReportedComments);
router.post("/resolve-comment/:commentId", admin, resolveReportedComment);

// You can add more admin routes here (videos, playlists, etc.)
//view comments
router.get("/comments", admin, getAllComments); // Example route for getting all comments

export default router;
