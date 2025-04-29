// // controllers/video.controller.js
// import { Video } from "../models/video.model.js";

// export const getTrendingVideos = async (req, res) => {
//   try {
//     const videos = await Video.find({ isPublished: true })
//       .sort({ views: -1, createdAt: -1 }) // trending logic: most viewed and newest
//       .limit(20)
//       .populate("owner", "username avatarUrl") // populate creator info
//       .lean();

//     const formatted = videos.map((v) => ({
//       _id: v._id,
//       title: v.title,
//       thumbnail: v.thumbnail || v.videoUrl + "?thumb=true", // fallback if no thumbnail
//       videoUrl: v.videoUrl,
//       views: v.views,
//       creatorName: v.owner?.username || "Unknown",
//       avatarUrl: v.owner?.avatarUrl || null,
//     }));

//     res.status(200).json({
//       success: true,
//       message: "Trending videos fetched successfully",
//       data: formatted,
//     });
//   } catch (error) {
//     console.error("Error fetching trending videos:", error);
//     res.status(500).json({
//       success: false,
//       message: "Something went wrong while fetching trending videos.",
//     });
//   }
// };


// controllers/video.controller.js


import { Video } from "../models/video.model.js";
import {Playlist} from "../models/playlist.model.js";

export const getTrendingVideos = async (req, res) => {
  try {
    // Fetch videos that are published
    const trendingVideos = await Video.find({ isPublished: false })
      .sort({ views: -1, createdAt: -1 }) 
      .limit(20)
      .populate("owner","username avatarUrl") 
      .lean();
  
    // If no trending videos are found, send a 404 response
    if (!trendingVideos || trendingVideos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No trending videos found.",
        data: [],
      });
    }
    // console.log(trendingVideos);

    // Format the video data for the response
    const formatted = trendingVideos.map((v) => ({
      _id: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail || `${v.videoUrl}?thumb=true`, // Default thumbnail fallback
      videoUrl: v.videoUrl,
      views: v.views,
      playlist: v._id,
     
      creatorName: v.owner?.username || "Unknown", // Fallback if owner is missing
      avatarUrl: v.owner?.avatarUrl || null, // Fallback for missing avatar
    }));
    // console.log(formatted);

    // Send the formatted response
    res.status(200).json({
      success: true,
      message: "Trending videos fetched successfully",
      data: formatted,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending videos",
    });
  }
};
