import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "./notificatonController.js";

// ---------- Like Logic ----------
const likeEntity = async ({ userId, targetId, model, field }) => {
  const target = await model.findById(targetId);
  if (!target) {
    return {
      liked: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} not found`,
    };
  }

  const likeExists = await Like.findOne({ likedBy: userId, [field]: targetId });

  if (likeExists) {
    const likeCount = await Like.countDocuments({ [field]: targetId, action: "like" });
    return {
      liked: true,
      likeCount,
      message: `Already liked this ${field}`,
    };
  }

  await Like.create({ likedBy: userId, [field]: targetId, action: "like" });

  const likeCount = await Like.countDocuments({ [field]: targetId, action: "like" });
  return {
    liked: true,
    likeCount,
    message: `${field} liked successfully`,
  };
};

// ---------- Dislike Logic ----------
const dislikeEntity = async ({ userId, targetId, model, field }) => {
  const target = await model.findById(targetId);
  if (!target) {
    return {
      liked: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} not found`,
    };
  }

  const like = await Like.findOneAndDelete({ likedBy: userId, [field]: targetId });

  const likeCount = await Like.countDocuments({ [field]: targetId, action: "like" });

  if (!like) {
    return {
      liked: false,
      likeCount,
      message: `Not previously liked this ${field}`,
    };
  }

  return {
    liked: false,
    likeCount,
    message: `${field} like removed successfully`,
  };
};

// ---------- Factory Handlers ----------
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

    return res.status(200).json(
      new ApiResponse(200, { likeCount: result.likeCount }, result.message)
    );
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

    return res.status(200).json(
      new ApiResponse(200, { likeCount: result.likeCount }, result.message)
    );
  });

// ---------- Exported Controllers ----------
export const likeVideo = createLikeHandler("video", Video, "video");
export const dislikeVideo = createDislikeHandler("video", Video, "video");

export const likeComment = createLikeHandler("comment", Comment, "comment");
export const dislikeComment = createDislikeHandler("comment", Comment, "comment");

export const likeTweet = createLikeHandler("tweet", Tweet, "tweet");
export const dislikeTweet = createDislikeHandler("tweet", Tweet, "tweet");


export const getVideoLikeCount = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid video ID"));
  }

  try {
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json(new ApiResponse(404, null, "Video not found"));
    }

    // Count total likes & dislikes
    const [likes, dislikes] = await Promise.all([
      Like.countDocuments({ video: videoId, action: "like" }),
      Like.countDocuments({ video: videoId, action: "dislike" }),
    ]);

    // Get recent 10 liked users with full info
    const likedByDocs = await Like.find({ video: videoId, action: "like" })
      .sort({ createdAt: -1 })
      .limit(10)


    const likedBy = likedByDocs.map(doc => doc.likedBy);

    // Return data without needing login
    return res.status(200).json(
      new ApiResponse(200, {
        likes,
        dislikes,
        hasDislikes: dislikes > 0,
        likedBy
      }, "Video like count retrieved")
    );
  } catch (error) {
    console.error("Error fetching video like count:", error);
    return res.status(500).json(new ApiResponse(500, null, "Server error"));
  }
});



// Controller: Get liked videos of the logged-in user
export const getLikedVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);
  const skip = (page - 1) * limit;

  // Step 1: Fetch likes by the logged-in user, where the liked item is a video
  const liked = await Like.find({
    likedBy: req.user._id, // ✅ Only current user
    video: { $exists: true },
    action: "like",
  })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "video",
      match: { status: { $ne: "deleted" } }, // ✅ Exclude deleted videos
      select:
        "title thumbnail views description createdAt updatedAt status genre tags videoUrl",
      populate: {
        path: "owner",
        select: "username email avatar", // Add avatar if needed
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  // Step 2: Filter out null videos (in case some videos were deleted)
  const likedVideos = liked.map((item) => item.video).filter(Boolean);

  // Step 3: Count total liked videos for this user
  const totalLikedVideos = await Like.countDocuments({
    likedBy: req.user._id,
    video: { $exists: true },
    action: "like",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likedVideos,
        total: totalLikedVideos,
        page,
        pages: Math.ceil(totalLikedVideos / limit),
      },
      "Liked videos retrieved successfully"
    )
  );
});





export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { action } = req.body;

  if (!req.user?._id) {
  throw new ApiError(401, "User must be logged in to like");
}


  if (!req.user || !req.user._id) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }
  

  if (!["like", "dislike"].includes(action)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid action"));
  }

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid video ID"));
  }

  const video = await Video.findById(videoId);
  if (!video || video.status === "deleted") {
    return res.status(404).json(new ApiResponse(404, null, "Video not found"));
  }

  //  if (String(video.owner._id) !== String(req.user._id)) {
  //     await createNotification({
  //       recipient: video.owner._id,
  //       sender: req.user._id,
  //       type: "like",
  //       entityId: video._id,
  //       message: `${req.user.username} liked your video "${video.title}"`
  //     });
  //   }

  const existing = await Like.findOne({ likedBy: req.user._id, video: videoId });

  if (existing) {
    if (existing.action === action) {
      await existing.deleteOne(); // Remove like/dislike
    } else {
      existing.action = action; // Switch like <-> dislike
      await existing.save();
    }
  } else {
    await Like.create({ likedBy: req.user._id, video: videoId, action });
  }

  const [likes, dislikes] = await Promise.all([
    Like.countDocuments({ video: videoId, action: "like" }),
    Like.countDocuments({ video: videoId, action: "dislike" }),
  ]);
  

  const userLike = await Like.findOne({ video: videoId, likedBy: req.user._id });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likes,
        dislikes,
        upvoted: userLike?.action === "like",
        downvoted: userLike?.action === "dislike",
      },
      "Video like/dislike toggled"
    )
  );
});




// controllers/video.controller.js










// ---------- Admin Like Stats ----------
export const getAdminLikeStats = asyncHandler(async (req, res) => {
  const totalLikes = await Like.countDocuments();
  const likesPerVideo = await Like.aggregate([
    { $match: { video: { $exists: true }, action: "like" } },
    { $group: { _id: "$video", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    { $unwind: "$videoDetails" },
    {
      $project: {
        _id: 0,
        videoId: "$_id",
        title: "$videoDetails.title",
        likeCount: "$count",
      },
    },
    { $sort: { likeCount: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, { totalLikes, likesPerVideo }, "Admin like analytics fetched")
  );
});
