import express from "express";
import { sendOtp, verifyOtp, resendOtp } from "../controllers/email.controllers.js";

const router = express.Router();


router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

export default router;
