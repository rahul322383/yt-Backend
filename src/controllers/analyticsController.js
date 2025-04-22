import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";

export const getPlaylistAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const playlists = await Playlist.find({ user: userId }).populate("videos");

    const totalPlaylists = playlists.length;
    let totalVideos = 0;
    let totalViews = 0;

    const viewsPerPlaylist = playlists.map((playlist) => {
      const views = playlist.videos.reduce((acc, video) => acc + (video.views || 0), 0);
      totalVideos += playlist.videos.length;
      totalViews += views;

      return {
        playlistId: playlist._id,
        playlistName: playlist.title,
        views,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalPlaylists,
        totalVideos,
        totalViews,
        viewsPerPlaylist,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching playlist analytics",
    });
  }
};
export const getVideoAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const videos = await Video.find({ user: userId });

    const totalVideos = videos.length;
    let totalViews = 0;

    const viewsPerVideo = videos.map((video) => {
      const views = video.views || 0;
      totalViews += views;
      return {
        videoId: video._id,
        title: video.title,
        views,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalVideos,
        totalViews,
        viewsPerVideo,
      },
    });
  } catch (error) {
    console.error("Video analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching video analytics",
    });
  }
};