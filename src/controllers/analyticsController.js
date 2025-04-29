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




// Fetch Video Analytics
export const getVideoAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;
    

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    const videos = await Video.find({ owner: userId }).select("title views").lean();
   

    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);

    const viewsPerVideo = videos.map((video) => ({
      videoId: video._id,
      title: video.title,
      views: video.views || 0,
      like: video.like || 0,
      comment: video.comment || 0
    }));

    return res.status(200).json(
      new ApiResponse(200, {
        totalVideos,
        totalViews,
        viewsPerVideo,
      }, "Video analytics fetched successfully")
    );

  } catch (error) {
    console.error("Error in getVideoAnalytics:", error);
    return res.status(500).json(new ApiResponse(500, null, "Error fetching video analytics"));
  }
};
