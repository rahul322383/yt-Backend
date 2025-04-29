import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// get user channel details
const getUserChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
 
  try {
    // Lookup the user by channelId
    let user = await User.findOne({ channelId });

    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
    } else {
      return res.status(200).json(new ApiResponse(200, user, "Channel details fetched successfully"));
    }
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
});


// 🔹 Get channel statistics
const getChannelStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || typeof channelId !== "string") {
    return res.status(400).json(new ApiResponse(400, null, "Invalid channel ID"));
  }

  // Find user by custom channelId
  const user = await User.findOne({ channelId });
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
  }

  // Check if logged-in user is subscribed to this user (via _id)
   const subscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: user._id, // use actual ObjectId ref to User
  });

  // if (!subscription) {
  //   return res
  //     .status(403)
  //     .json(new ApiResponse(403, null, "Subscription not found or Unauthorized access"));
  // }

  // Aggregate video stats
  const [videoStats = {}] = await Video.aggregate([
    { $match: { owner: user._id } },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const [totalSubscribers, totalLikes] = await Promise.all([
    Subscription.countDocuments({ channel: user._id }), // Use correct field
    Like.countDocuments({ videoOwner: user._id }),
  ]);

  const stats = {
    channelId: user.channelId,
    totalVideos: videoStats.totalVideos || 0,
    totalViews: videoStats.totalViews || 0,
    totalSubscribers,
    totalLikes,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel statistics retrieved successfully"));
});





// 🔹 Get paginated channel videos
const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10)) || 1;
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10)) || 10, 100); // Limit max 100 videos per page

  // Validate channelId
  if (!channelId ) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid channel ID"));
  }

  // Check if the channel (user) exists
  const channelUser = await User.findOne({channelId} );
  if (!channelUser) {
    return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
  }

  try {
    // Build a query to fetch videos owned by the channel
    // const query = { owner: new mongoose.Types.ObjectId(channelId) };
    const query = { owner: channelUser._id };


    // Execute both queries concurrently for performance
    const [videos, totalVideos] = await Promise.all([
      Video.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Video.countDocuments(query),
    ]);

    return res.status(200).json(new ApiResponse(
      200,
      {
        channelId,
        videos,
        totalVideos,
        page,
        limit,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "Channel videos retrieved successfully"
    ));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
});


export {
  getUserChannel,
  getChannelStatus,
  getChannelVideos,
  // Subscription
};
