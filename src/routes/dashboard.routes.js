import { Router } from 'express';
import {
    getUserChannel,
    getChannelStatus,
    getChannelVideos,
    // Subscription
} from "../controllers/dashboard.controllers.js"
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/:username/:channelId").get(getUserChannel);
router.route("/:username/:channelId/status").get(getChannelStatus);
router.route("/:username/:channelId/videos").get(getChannelVideos);
// router.route("/:username/:channelId/subscriptions").get(Subscription);

export default router;
