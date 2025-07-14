// import { Video } from "../models/video.model.js";

// export const getTrendingVideos = async (req, res) => {
//   try {
//     // Fetch all published videos (works for logged-in or not)
//     const trendingVideos = await Video.find({ isPublished: true })
//       .select("title thumbnail videoUrl views likes dislikes comments playlistId owner createdAt")
//       .sort({ views: -1, createdAt: -1 }) // sort by views desc, then newest
//       .limit(20)
//       .populate("owner", "username avatarUrl channelId") // adjust field names to your schema
//       .lean();
    

//     if (!trendingVideos || trendingVideos.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No trending videos found.",
//         data: [],
//       });
//     }

//     // Format videos for frontend
//     const formatted = trendingVideos.map((v) => ({
//       _id: v._id,
//       title: v.title,
//       thumbnail: v.thumbnail || `${v.videoUrl}?thumb=true`,
//       videoUrl: v.videoUrl,
//       views: v.views,
//       likeCount: typeof v.likes === "number" ? v.likes : v.likes?.length || 0,
//       dislikeCount: typeof v.dislikes === "number" ? v.dislikes : v.dislikes?.length || 0,
//       commentCount: typeof v.comments === "number" ? v.comments : v.comments?.length || 0,
//       playlist: Array.isArray(v.playlistId) ? v.playlistId[0] : null,
//       channelId: v.owner?.channelId || null,
//       creatorName: v.owner?.username || "Unknown",
//       avatarUrl: v.owner?.avatarUrl || null,
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Trending videos fetched successfully",
//       data: formatted,
//     });
//   } catch (error) {
//     console.error("Error fetching trending videos:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch trending videos",
//       error: error.message,
//     });
//   }
// };




import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

export const getTrendingVideos = async (req, res) => {
  try {
    // Step 1: Fetch top 20 videos sorted by views
    const trendingVideos = await Video.find({ isPublished: true })
      .select("title thumbnail videoUrl views playlistId owner createdAt")
      .sort({ views: -1, createdAt: -1 })
      .limit(20)
      .populate("owner", "username avatarUrl channelId")
      .lean();

    if (!trendingVideos || trendingVideos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No trending videos found.",
        data: [],
      });
    }

    const videoIds = trendingVideos.map((v) => v._id);

    // Step 2: Get like/dislike counts from Like model
    const likeAgg = await Like.aggregate([
      { $match: { video: { $in: videoIds } } },
      {
        $group: {
          _id: { video: "$video", action: "$action" },
          count: { $sum: 1 },
        },
      },
    ]);

    const likesMap = {};
    for (const item of likeAgg) {
      const vid = String(item._id.video);
      if (!likesMap[vid]) likesMap[vid] = { likeCount: 0, dislikeCount: 0 };
      if (item._id.action === "like") likesMap[vid].likeCount = item.count;
      if (item._id.action === "dislike") likesMap[vid].dislikeCount = item.count;
    }

    // Step 3: Get comment counts
    const commentAgg = await Comment.aggregate([
      { $match: { video: { $in: videoIds }, isDeleted: false } },
      {
        $group: {
          _id: "$video",
          commentCount: { $sum: 1 },
        },
      },
    ]);

    const commentMap = {};
    for (const item of commentAgg) {
      commentMap[String(item._id)] = item.commentCount;
    }

    // Step 4: Final formatting
    const formatted = trendingVideos.map((v) => {
      const likeInfo = likesMap[String(v._id)] || { likeCount: 0, dislikeCount: 0 };
      const commentCount = commentMap[String(v._id)] || 0;

      return {
        _id: v._id,
        title: v.title,
        thumbnail: v.thumbnail || `${v.videoUrl}?thumb=true`,
        videoUrl: v.videoUrl,
        views: v.views || 0,
        likeCount: likeInfo.likeCount,
        dislikeCount: likeInfo.dislikeCount,
        commentCount,
        playlist: Array.isArray(v.playlistId) ? v.playlistId[0] : null,
        channelId: v.owner?.channelId || null,
        creatorName: v.owner?.username || "Unknown",
        avatarUrl: v.owner?.avatarUrl || null,
        createdAt: v.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Trending videos fetched successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching trending videos:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trending videos",
      error: error.message,
    });
  }
};
