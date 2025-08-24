import { Router } from "express";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
  toggleNotification,
  getSubscriptionStatus
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

 
const router = Router();

// ✅ Get all channels a user is subscribed to
router.get("/subscribed/:channelId", verifyJWT, getSubscribedChannels);

// ✅ Subscribe/Unsubscribe to a channel
router.post("/:channelId",  verifyJWT,toggleSubscription);

// ✅ Get all subscribers of a channel
router.get("/channel/:channelId", verifyJWT,getUserChannelSubscribers);

// ✅ Toggle notifications for a channel
router.post("/notify-toggle/:channelId", verifyJWT,toggleNotification);

// GET /subscriptions/status/:channelId
router.get("/status/:channelId", verifyJWT,getSubscriptionStatus);

export default router;
