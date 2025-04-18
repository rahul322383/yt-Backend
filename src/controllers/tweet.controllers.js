import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { likeTweet } from "./like.controllers.js";
import {Like }from "../models/like.model.js";
// ✅ Create a new tweet
const createTweet = asyncHandler(async (req, res) => {
    const { content, mediaUrl } = req.body;

    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required");
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        mediaUrl,
        owner: req.user._id,
    });

    return res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    );
});

// ✅ Get tweets by a specific user
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.find({ owner: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("owner", "username avatar");

    const totalTweets = await Tweet.countDocuments({ owner: userId });

    return res.status(200).json(
        new ApiResponse(200, { tweets, totalTweets, page, limit }, "User tweets retrieved successfully")
    );
});

// ✅ Update a tweet (must be owner)
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content, mediaUrl } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const updatedData = {};
    if (content !== undefined) updatedData.content = content.trim();
    if (mediaUrl !== undefined) updatedData.mediaUrl = mediaUrl;

    const tweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, owner: req.user._id },
        updatedData,
        { new: true, runValidators: true }
    );

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or unauthorized");
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    );
});

// ✅ Delete a tweet (must be owner)
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user._id,
    });

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or unauthorized");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Tweet deleted successfully")
    );
});



// ✅ Toggle Like/Unlike a Tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const existing = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id,
    });

    if (existing) {
        await existing.deleteOne();
        tweet.likeCount = Math.max((tweet.likeCount || 1) - 1, 0);
        await tweet.save();
        return res.status(200).json(
            new ApiResponse(200, { liked: false, likeCount: tweet.likeCount }, "Tweet unliked")
        );
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id,
    });

    tweet.likeCount = (tweet.likeCount || 0) + 1;
    await tweet.save();
    return res.status(201).json(
        new ApiResponse(201, { liked: true, likeCount: tweet.likeCount }, "Tweet liked")
    );
});

// ✅ Get total likes of a tweet
const getTweetLikes = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const likeCount = await Like.countDocuments({ tweet: tweetId });

    return res.status(200).json(
        new ApiResponse(200, { tweetId, likeCount }, "Total likes fetched")
    );
});

// ✅ Admin: Get top liked tweets
const getTopLikedTweets = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const topTweets = await Tweet.find({})
        .sort({ likeCount: -1 })
        .limit(limit)
        .populate("owner", "username avatar");

    return res.status(200).json(
        new ApiResponse(200, topTweets, "Top liked tweets fetched")
    );
});


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    toggleTweetLike,
    getTweetLikes,
    getTopLikedTweets
};
