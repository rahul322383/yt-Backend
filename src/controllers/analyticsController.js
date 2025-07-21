// // controllers/analytics.controller.js

// import mongoose from "mongoose";
// import { Playlist } from "../models/playlist.model.js";
// import { Video } from "../models/video.model.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { User } from "../models/user.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { Like } from "../models/like.model.js";

// export const getPlaylistAnalytics = asyncHandler(async (req, res) => {
//   const playlists = await Playlist.find({ owner: req.user._id });

//   const analytics = [];

//   for (const playlist of playlists) {
//     let totalViews = 0;
//     let totalLikes = 0;

//     const videos = await Promise.all(
//       playlist.videos.map(async (video) => {
//         const [likesCount, dislikesCount] = await Promise.all([
//           Like.countDocuments({ refId: video.videoRef, refType: "Video", action: "like" }),
//           Like.countDocuments({ refId: video.videoRef, refType: "Video", action: "dislike" })
//         ]);

//         totalViews += video.views || 0;
//         totalLikes += likesCount;

//         return {
//           videoId: video.videoId,
//           title: video.title,
//           videoUrl: video.videoUrl,
//           videoRef: video.videoRef,
//           uploadedAt: video.uploadedAt,
//           likes: likesCount,
//           dislikes: dislikesCount,
//           _id: video._id
//         };
//       })
//     );

//     analytics.push({
//       playlistId: playlist._id,
//       videoCount: playlist.videos.length,
//       totalViews,
//       totalLikes,
//       videos
//     });
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, analytics, "All playlists analytics fetched successfully"));
// });




// export const getVideoAnalytics = async (req, res) => {
//   try {
//     const userId = req.user?._id;

//     if (!userId) {
//       return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
//     }

//     const user = await User.findById(userId).select("name channelName").lean();
//     if (!user) {
//       return res.status(404).json(new ApiResponse(404, null, "User not found"));
//     }

//     const videoStats = await Video.aggregate([
//       { $match: { owner: userId } },

//       // Lookup playlists that include this video
//       {
//         $lookup: {
//           from: "playlists",
//           localField: "_id",
//           foreignField: "videos",
//           as: "playlistDetails",
//         },
//       },

//       // Optional: flatten the playlist list if needed
//       {
//         $unwind: {
//           path: "$playlistDetails",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // Attach channel & owner info
//       {
//         $set: {
//           channelName: user.channelName || null,
//           videoOwner: user.name || null,
//         },
//       },

//       // Group all analytics
//       {
//         $group: {
//           _id: null,
//           totalVideos: { $sum: 1 },
//           totalViews: { $sum: { $ifNull: ["$views", 0] } },
//           totalLikes: {
//             $sum: {
//               $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0],
//             },
//           },
//           totalComments: {
//             $sum: {
//               $cond: [{ $isArray: "$comments" }, { $size: "$comments" }, 0],
//             },
//           },
//           viewsPerVideo: {
//             $push: {
//               videoId: "$_id",
//               title: "$title",
//               views: { $ifNull: ["$views", 0] },
//               likes: {
//                 $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0],
//               },
//               comments: {
//                 $cond: [{ $isArray: "$comments" }, { $size: "$comments" }, 0],
//               },
//               videoUrl: {
//                 $concat: [
//                   "/user/playlist/videos/",
//                   { $toString: "$_id" },
//                   "/watch",
//                 ],
//               },
//               channelName: "$channelName",
//               videoOwner: "$videoOwner",
//               playlistId: "$playlistDetails._id",
//               playlistTitle: "$playlistDetails.title",
//             },
//           },
//         },
//       },

//       // Remove _id from output
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

//     // If no videos found
//     if (!videoStats?.length) {
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

//     return res.status(200).json(
//       new ApiResponse(200, videoStats[0], "Video analytics fetched successfully")
//     );

//   } catch (error) {
//     console.error("Error in getVideoAnalytics:", error);
//     return res.status(500).json(
//       new ApiResponse(500, null, "Error fetching video analytics")
//     );
//   }
// };



import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

export const getPlaylistAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Step 1: Get all playlists owned by the user
  const playlists = await Playlist.find({ owner: userId })
    .select("_id name videos")
    .lean();

  if (!playlists || playlists.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No playlists found"));
  }

  // Step 2: For each playlist, analyze the videos
  const analytics = await Promise.all(
    playlists.map(async (playlist) => {
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;

      const videosData = await Promise.all(
        playlist.videos.map(async ({ videoRef, uploadedAt }) => {
          if (!videoRef) return null;

          const videoDoc = await Video.findById(videoRef)
            .select("title videoUrl thumbnailUrl duration views createdAt")
            .lean();

          if (!videoDoc) return null;

          const [likesCount, dislikesCount, commentsCount] = await Promise.all([
            Like.countDocuments({ refId: videoRef, refType: "Video", action: "like" }),
            Like.countDocuments({ refId: videoRef, refType: "Video", action: "dislike" }),
            Comment.countDocuments({ video: videoRef })
          ]);

          totalViews += videoDoc.views || 0;
          totalLikes += likesCount;
          totalComments += commentsCount;

          return {
            videoId: videoRef,
            title: videoDoc.title || "Untitled",
            videoUrl: videoDoc.videoUrl || "",
            thumbnailUrl: videoDoc.thumbnailUrl || "",
            duration: videoDoc.duration || "0:00",
            views: videoDoc.views || 0,
            likes: likesCount,
            dislikes: dislikesCount,
            comments: commentsCount,
            uploadedAt: videoDoc.createdAt || uploadedAt || new Date(),
          };
        })
      );

      // Filter out any null/undefined entries
      const validVideos = videosData.filter(Boolean);

      return {
        playlistId: playlist._id,
        playlistTitle: playlist.name,
        videoCount: validVideos.length,
        totalViews,
        totalLikes,
        totalComments,
        videos: validVideos
      };
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, analytics, "Playlist analytics fetched successfully"));
});



export const getVideoAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  // Fetch all videos uploaded by the current user
  const videos = await Video.find({ owner: userId });

  // Get all video IDs
  const videoIds = videos.map((video) => video._id);

  // Aggregate likes & dislikes from Like model
  const likeStats = await Like.aggregate([
    {
      $match: {
        video: { $in: videoIds },
      },
    },
    {
      $group: {
        _id: { video: "$video", action: "$action" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Organize like/dislike counts per video
  const likeMap = {};
  likeStats.forEach((entry) => {
    const vid = entry._id.video.toString();
    const action = entry._id.action;
    if (!likeMap[vid]) {
      likeMap[vid] = { like: 0, dislike: 0 };
    }
    likeMap[vid][action] = entry.count;
  });

  // Aggregate comment count per video
  const commentStats = await Comment.aggregate([
    {
      $match: {
        video: { $in: videoIds },
      },
    },
    {
      $group: {
        _id: "$video",
        count: { $sum: 1 },
      },
    },
  ]);

  const commentMap = {};
  commentStats.forEach((entry) => {
    commentMap[entry._id.toString()] = entry.count;
  });

  // Prepare viewsPerVideo analytics
  const viewsPerVideo = videos.map((video) => {
    const vid = video._id.toString();
    return {
      videoId: vid,
      title: video.title,
      views: video.views || 0,
      likes: likeMap[vid]?.like || 0,
      dislikes: likeMap[vid]?.dislike || 0,
      comments: commentMap[vid] || 0,
      videoUrl: video.videoUrl || video.url || "",
      duration: video.duration,
      channelName: video.ownerDetails?.fullName || "", // You can populate owner
      videoOwner: video.ownerDetails?.fullName || "",
      uploadedAt: video.createdAt,
      playlistId: video.playlist?._id || null,
      playlistTitle: video.playlist?.title || "",
    };
  });

  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = Object.values(likeMap).reduce((acc, curr) => acc + (curr.like || 0), 0);
  const totalDislikes = Object.values(likeMap).reduce((acc, curr) => acc + (curr.dislike || 0), 0);
  const totalComments = commentStats.reduce((acc, curr) => acc + curr.count, 0);

  // Optional: Playlist analytics
  const playlistStats = await Playlist.aggregate([
    {
      $match: { owner: userId },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "playlist",
        as: "videos",
      },
    },
    {
      $project: {
        playlistId: "$_id",
        playlistTitle: "$title",
        videoCount: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: "Video analytics fetched successfully",
    data: {
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      totalDislikes,
      totalComments,
      viewsPerVideo,
      playlists: playlistStats,
    },
  });
});
