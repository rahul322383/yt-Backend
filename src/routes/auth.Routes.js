import express from "express";
import passport from "passport";
import {
  handleOAuthCallback,
  forgotPassword,
  // resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

// 🔐 Forgot/Reset Password Routes
router.post("/forget-password", forgotPassword);
// router.post("/reset-password/:token", resetPassword);

// 🌐 OAuth Callback Handler (e.g. Google/GitHub/Facebook)
router.get("/oauth/callback", passport.authenticate("oauth-provider", { session: false }), handleOAuthCallback);

export default router;
