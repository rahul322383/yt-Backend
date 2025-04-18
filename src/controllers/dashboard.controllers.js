import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🔹 Get statistics for a channel
const getChannelStatus = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, "Invalid channel ID");
    }
  
    const objectId = new mongoose.Types.ObjectId(channelId);
  
    // Get video stats (count + views)
    const [videoStats = {}] = await Video.aggregate([
      { $match: { owner: objectId } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" }
        }
      }
    ]);
  
    // Count subscribers and likes
    const [totalSubscribers, totalLikes] = await Promise.all([
      Subscription.countDocuments({ channel: objectId }),
      Like.countDocuments({ videoOwner: objectId })
    ]);
  
    const stats = {
      channelId,
      totalVideos: videoStats.totalVideos || 0,
      totalViews: videoStats.totalViews || 0,
      totalSubscribers,
      totalLikes
    };
  
    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Channel statistics retrieved successfully"));
  });
  

// 🔹 Get paginated videos uploaded by a channel
const getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(1, parseInt(req.query.limit)) || 10;
  
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, "Invalid channel ID");
    }
  
    const query = { owner: new mongoose.Types.ObjectId(channelId) };
  
    const [videos, totalVideos] = await Promise.all([
      Video.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Video.countDocuments(query)
    ]);
  
    return res.status(200).json(
      new ApiResponse(200, {
        channelId,
        videos,
        totalVideos,
        page,
        limit,
        totalPages: Math.ceil(totalVideos / limit)
      }, "Channel videos retrieved successfully")
    );
  });
  
export {
    getChannelStatus,
    getChannelVideos
};
