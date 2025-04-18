import { Router } from "express";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// ✅ Subscribe/Unsubscribe to a channel
router.post("/:channelId", verifyJWT, toggleSubscription);

// ✅ Get all subscribers of a channel
router.get("/channel/:channelId", verifyJWT, getUserChannelSubscribers);

// ✅ Get all channels a user is subscribed to
router.get("/user/subscriber/:subscriberId", verifyJWT, getSubscribedChannels);

export default router;
