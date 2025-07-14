// controllers/analytics.controller.js

import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

// Fetch Playlist Analytics
import mongoose from "mongoose";

export const getPlaylistAnalytics = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    if (playlistId) {
      if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid playlistId"));
      }

      const playlist = await Playlist.findOne({ _id: playlistId, owner: userId })
        .populate("videos", "title views")
        .lean();

      if (!playlist) {
        return res.status(404).json(new ApiResponse(404, null, "Playlist not found for this user"));
      }

      const views = (playlist.videos || []).reduce((sum, video) => sum + (video?.views || 0), 0);

      return res.status(200).json(new ApiResponse(200, {
        playlistId: playlist._id,
        title: playlist.title,
        videoCount: playlist.videos.length,
        totalViews: views,
      }, "Playlist analytics fetched successfully"));
    }

    // If no specific playlistId, get analytics for all playlists
    const playlists = await Playlist.find({ owner: userId })
      .populate("videos", "title views")
      .lean();

    const analytics = playlists.map((playlist) => {
      const totalViews = (playlist.videos || []).reduce((sum, video) => sum + (video?.views || 0), 0);
      return {
        playlistId: playlist._id,
        title: playlist.title,
        videoCount: playlist.videos.length,
        totalViews,
      };
    });

    return res.status(200).json(new ApiResponse(200, analytics, "All playlists analytics fetched successfully"));

  } catch (error) {
    console.error("Error in getPlaylistAnalytics:", error);
    return res.status(500).json(new ApiResponse(500, null, "Error fetching playlist analytics"));
  }
};

export const getVideoAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    const user = await User.findById(userId).select("name channelName").lean();
    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    const videoStats = await Video.aggregate([
      { $match: { owner: userId } },
      {
        $lookup: {
          from: "playlists",
          localField: "_id",
          foreignField: "videos",
          as: "playlistDetails",
        },
      },
      {
        $unwind: {
          path: "$playlistDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // 👇 Add channel info to each video BEFORE grouping
      {
        $set: {
          channelName: user.channelName || null,
          videoOwner: user.name || null,
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          totalLikes: {
            $sum: {
              $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0],
            },
          },
          totalComments: {
            $sum: {
              $cond: [{ $isArray: "$comments" }, { $size: "$comments" }, 0],
            },
          },
          viewsPerVideo: {
            $push: {
              videoId: "$_id",
              title: "$title",
              views: { $ifNull: ["$views", 0] },
              likes: {
                $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0],
              },
              comments: {
                $cond: [{ $isArray: "$comments" }, { $size: "$comments" }, 0],
              },
              videoUrl: {
                $concat: [
                  "/user/playlist/videos/",
                  { $toString: "$_id" },
                  "/watch",
                ],
              },
              channelName: "$channelName",
              videoOwner: "$videoOwner",
              playlistId: "$playlistDetails._id",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalVideos: 1,
          totalViews: 1,
          totalLikes: 1,
          totalComments: 1,
          viewsPerVideo: 1,
        },
      },
    ]);

    if (!videoStats?.length) {
      return res.status(200).json(
        new ApiResponse(200, {
          totalVideos: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          viewsPerVideo: [],
        }, "No videos found")
      );
    }

    return res.status(200).json(
      new ApiResponse(200, videoStats[0], "Video analytics fetched successfully")
    );

  } catch (error) {
    console.error("Error in getVideoAnalytics:", error);
    return res.status(500).json(
      new ApiResponse(500, null, "Error fetching video analytics")
    );
  }
};




// export const getVideoAnalytics = async (req, res) => {
//   try {
//     const userId = req.user?._id;

//     // 1. Auth Check
//     if (!userId) {
//       return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
//     }

//     // 2. Fetch user details
//     const user = await User.findById(userId).select("name channelName").lean();
//     if (!user) {
//       return res.status(404).json(new ApiResponse(404, null, "User not found"));
//     }

//     // 3. Aggregation
//     const videoStats = await Video.aggregate([
//       { $match: { owner: userId } },
//       {
//         $lookup: {
//           from: "playlists",
//           localField: "_id",
//           foreignField: "videos",
//           as: "playlistDetails",
//         },
//       },
//       {
//         $unwind: {
//           path: "$playlistDetails",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalVideos: { $sum: 1 },
//           totalViews: { $sum: { $ifNull: ["$views", 0] } },
//           totalLikes: { $sum: { $ifNull: ["$likes", 0] } },
//           totalComments: { $sum: { $ifNull: ["$comments", 0] } },
//           viewsPerVideo: {
//             $push: {
//               videoId: "$_id",
//               title: "$title",
//               views: { $ifNull: ["$views", 0] },
//               likes: { $ifNull: ["$likes", 0] },
//               comments: { $ifNull: ["$comments", 0] },
//               totalDuration: "$duration",
//               watchTime: "$watchTime",
//               originalUrl: "$originalUrl", // If it exists in schema
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           totalVideos: 1,
//           totalViews: 1,
//           totalLikes: 1,
//           totalComments: 1,
//           viewsPerVideo: 1,
//         },
//       },
//     ]);

//     // 4. Handle No Data
//     if (!videoStats || videoStats.length === 0) {
//       return res.status(200).json(
//         new ApiResponse(200, {
//           totalVideos: 0,
//           totalViews: 0,
//           totalLikes: 0,
//           totalComments: 0,
//           viewsPerVideo: [],
//         }, "No videos found")
//       );
//     }

//     console.log("Video Stats:", videoStats);

//     // 5. Add channel info + video URL after aggregation
//     const analyticsData = videoStats[0];
//     analyticsData.viewsPerVideo = analyticsData.viewsPerVideo.map((video) => ({
//       ...video,
//       videoUrl: video.originalUrl,
//       channelName: user.channelName,
//       videoOwner: user.name,
//     }));

//     // 6. Return Success
//     return res.status(200).json(
//       new ApiResponse(200, analyticsData, "Video analytics fetched successfully")
//     );

//   } catch (error) {
//     console.error("Error in getVideoAnalytics:", error);
//     return res.status(500).json(new ApiResponse(500, null, "Error fetching video analytics"));
//   }
// };

