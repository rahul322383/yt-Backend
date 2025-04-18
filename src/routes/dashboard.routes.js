import { Router } from 'express';
import {
    getChannelStatus,
    getChannelVideos,
} from "../controllers/dashboard.controllers.js"
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/status").get(getChannelStatus);
router.route("/videos").get(getChannelVideos);

export default router;
