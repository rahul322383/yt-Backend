import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const likeEntity = async ({ userId, targetId, model, field }) => {
  const target = await model.findById(targetId);
  if (!target) {
    return { liked: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} not found` };
  }

  const likeExists = await Like.findOne({ likedBy: userId, [field]: targetId });

  if (likeExists) {
    const likeCount = await Like.countDocuments({ [field]: targetId });
    return { liked: true, likeCount, message: `Already liked this ${field}` };
  }

  await Like.create({ likedBy: userId, [field]: targetId });

  const likeCount = await Like.countDocuments({ [field]: targetId });
  return { liked: true, likeCount, message: `${field} liked successfully` };
};


const dislikeEntity = async ({ userId, targetId, model, field }) => {
  const target = await model.findById(targetId);
  if (!target) {
    return { liked: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} not found` };
  }

  const like = await Like.findOneAndDelete({ likedBy: userId, [field]: targetId });

  const likeCount = await Like.countDocuments({ [field]: targetId });

  if (!like) {
    return { liked: false, likeCount, message: `Not previously liked this ${field}` };
  }

  return { liked: false, likeCount, message: `${field} like removed successfully` };
};

const createLikeHandler = (type, model, field) =>
  asyncHandler(async (req, res) => {
    const targetId = req.params[`${type}Id`];
    if (!isValidObjectId(targetId)) {
      throw new ApiError(400, `Invalid ${type} ID`);
    }

    const result = await likeEntity({
      userId: req.user._id,
      targetId,
      model,
      field,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { likeCount: result.likeCount }, result.message));
  });


const createDislikeHandler = (type, model, field) =>
  asyncHandler(async (req, res) => {
    const targetId = req.params[`${type}Id`];
    if (!isValidObjectId(targetId)) {
      throw new ApiError(400, `Invalid ${type} ID`);
    }

    const result = await dislikeEntity({
      userId: req.user._id,
      targetId,
      model,
      field,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { likeCount: result.likeCount }, result.message));
  });


export const likeVideo = createLikeHandler("video", Video, "video");
export const dislikeVideo = createDislikeHandler("video", Video, "video");

export const likeComment = createLikeHandler("comment", Comment, "comment");
export const dislikeComment = createDislikeHandler("comment", Comment, "comment");

export const likeTweet = createLikeHandler("tweet", Tweet, "tweet");
export const dislikeTweet = createDislikeHandler("tweet", Tweet, "tweet");


export const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const [liked, total] = await Promise.all([
    Like.find({
      likedBy: req.user._id,
      video: { $exists: true },
    })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: "video",
        select: "title thumbnail views owner",
        populate: { path: "owner", select: "username avatar" },
      })
      .sort({ createdAt: -1 })
      .lean(),
    Like.countDocuments({ likedBy: req.user._id, video: { $exists: true } }),
  ]);

  const likedVideos = liked.filter((item) => item.video); // Exclude deleted

  return res.status(200).json(
    new ApiResponse(200, {
      likedVideos,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    }, "Liked videos retrieved successfully")
  );
});


export const getVideoLikeCount = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new ApiError(400, "Invalid video ID"));
  }

  const video = await Video.findById(videoId);
  if (video.status === "deleted")
    return res.status(404).json(new ApiError(404, "Video not found"));
    

  const likeCount = await Like.countDocuments({ video: videoId });

  return res
    .status(200)
    .json(new ApiResponse(200, { likeCount }, "Video like count retrieved"));
});


export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new ApiError(400, "Invalid video ID"));
  }

  const video = await Video.findById(videoId);
  if (video.status === "deleted")
    return res.status(404).json(new ApiError(404, "Video not found"));

  const existingLike = await Like.findOne({ likedBy: req.user._id, video: videoId });

  let likeCount;

  if (existingLike) {
    await existingLike.deleteOne();
    likeCount = await Like.countDocuments({ video: videoId });
    return res.status(200).json(
      new ApiResponse(200, { liked: false, likeCount }, "Like removed")
    );
  }

  await Like.create({ likedBy: req.user._id, video: videoId });
  likeCount = await Like.countDocuments({ video: videoId });

  return res.status(201).json(
    new ApiResponse(201, { liked: true, likeCount }, "Video liked")
  );
});



export const getAdminLikeStats = asyncHandler(async (req, res) => {
  const totalLikes = await Like.countDocuments();
  const likesPerVideo = await Like.aggregate([
    { $match: { video: { $exists: true } } },
    { $group: { _id: "$video", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "_id",
        as: "videoDetails"
      }
    },
    { $unwind: "$videoDetails" },
    {
      $project: {
        _id: 0,
        videoId: "$_id",
        title: "$videoDetails.title",
        likeCount: "$count"
      }
    },
    { $sort: { likeCount: -1 } }
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      totalLikes,
      likesPerVideo
    }, "Admin like analytics fetched")
  );
});
