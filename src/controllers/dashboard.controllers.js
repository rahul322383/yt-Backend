import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🔹 Get channel statistics
const getChannelStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid channel ID"));
  }

  const channel = await Subscription.findOne({ channel: channelId });

  if (!channel) {
    return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
  }

  if (channel.subscriber.toString() !== req.user._id.toString()) {
    return res.status(403).json(new ApiResponse(403, null, "Unauthorized access"));
  }

  const objectId = new mongoose.Types.ObjectId(channelId);

  const [videoStats = {}] = await Video.aggregate([
    { $match: { owner: objectId } },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const [totalSubscribers, totalLikes] = await Promise.all([
    Subscription.countDocuments({ channel: objectId }),
    Like.countDocuments({ videoOwner: objectId }),
  ]);

  const stats = {
    channelId,
    totalVideos: videoStats.totalVideos || 0,
    totalViews: videoStats.totalViews || 0,
    totalSubscribers,
    totalLikes,
  };

  return res.status(200).json(
    new ApiResponse(200, stats, "Channel statistics retrieved successfully")
  );
});

// 🔹 Get paginated channel videos
const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = Math.max(1, parseInt(req.query.limit)) || 10;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid channel ID"));
  }

  const query = { owner: new mongoose.Types.ObjectId(channelId) };

  const [videos, totalVideos] = await Promise.all([
    Video.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Video.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
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
    )
  );
});

export {
  getChannelStatus,
  getChannelVideos,
};
