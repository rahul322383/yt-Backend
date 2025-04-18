import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
    toggleTweetLike,
    getTweetLikes,
    getTopLikedTweets
} from "../controllers/tweet.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// ✅ Apply JWT auth to all routes
router.use(verifyJWT);

// ✅ Create a new tweet
router.post("/", createTweet);

// ✅ Get all tweets by a specific user
router.get("/user/:userId", getUserTweets);

// ✅ Update or delete a tweet (by owner)
router
    .route("/:tweetId")
    .patch(updateTweet)
    .delete(deleteTweet);

    router.post("/:tweetId/toggle-like", verifyJWT, toggleTweetLike);
    router.get("/:tweetId/likes", verifyJWT, getTweetLikes);
    router.get("/admin/top-liked", verifyJWT,    getTopLikedTweets);
    



export default router;
