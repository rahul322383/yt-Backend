import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import crypto from "crypto";
import { upload } from "../middleware/multer.middleware.js";
import { Video } from "../models/video.model.js";
import { channel } from "diagnostics_channel";
import {Like} from '../models/like.model.js'
import {Comment} from '../models/comment.model.js'
import fs from 'fs';
import path from 'path';




// Create Playlist
export const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Name is required")  
    )
  }
  
  if (!description) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Description is required")  
    )
  }
  

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});


// Update Playlist
export const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json(
      new ApiResponse(400, {}, "The provided playlist ID is invalid. Please ensure it follows the correct format.")
    );
  }

  const updated = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    { $set: { name, description } },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      message: "Playlist not found or unauthorized",
    })
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Playlist updated successfully"));
});






export const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const {
    title,
    description = "",
    tags = [],
    category = "22",             // Default YouTube category (People & Blogs)
    allowComments = true,
    allowRatings = true,
    language = "en",
  } = req.body;

  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  // Validate playlist ID
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Invalid playlist ID.")
    );
  }

  // Validate required fields
  if (!title || title.trim().length === 0) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Title is required.")
    );
  }

  if (!videoFile) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Video file is required.")
    );
  }

  // Fetch the playlist
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json(
      new ApiResponse(404, {}, "Playlist not found.")
    );
  }

  // 💥 Always publish by default
  const privacyStatus = "public";
  const isPublished = true;

  // Upload video
  const videoUpload = await uploadOnCloudinary(videoFile.path);
  if (!videoUpload?.url) {
    return res.status(500).json(
      new ApiResponse(500, {}, "Video upload failed.")
    );
  }

  // Upload thumbnail (or fallback to video preview)
  let thumbnailUrl = "";
  if (thumbnailFile) {
    const thumbnailUpload = await uploadOnCloudinary(thumbnailFile.path);
    thumbnailUrl = thumbnailUpload?.url || "";
  } else {
    thumbnailUrl = videoUpload.thumbnailUrl || videoUpload.url;
  }

  // Normalize tags
  const normalizedTags = Array.isArray(tags)
    ? tags.map((t) => t.trim())
    : typeof tags === "string"
    ? tags.split(",").map((t) => t.trim())
    : [];

  // Create new video doc
  const newVideo = await Video.create({
    playlistId: [playlistId],
    channelId: req.user.channelId,
    title: title.trim(),
    description: description.trim(),
    tags: normalizedTags,
    category,
    privacyStatus,
    allowComments: allowComments === "false" ? false : Boolean(allowComments),
    allowRatings: allowRatings === "false" ? false : Boolean(allowRatings),
    language,
    videoUrl: videoUpload.url,
    thumbnail: thumbnailUrl,
    owner: req.user._id,
    isPublished,
    likes: [],
    dislikes: [],
    views: 0,
    viewedBy: [],
    comments: [],
    uploadedAt: new Date(),
    playlistRef: playlistId,
  });

  // Add video to playlist
  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    {
      $addToSet: {
        videos: {
          videoId: newVideo._id,
          title: newVideo.title,
          videoRef: newVideo._id,
          videoUrl: newVideo.videoUrl,
          thumbnail: newVideo.thumbnail,
          isPublished: newVideo.isPublished,
          owner: newVideo.owner,
          likes: newVideo.likes,
          views: newVideo.views,
          dislikes: newVideo.dislikes,
          viewedBy: newVideo.viewedBy,
          tags: newVideo.tags,
          comments: newVideo.comments,
          uploadedAt: newVideo.uploadedAt,
          playlistRef: playlistId,
        },
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    return res.status(404).json({
      success: false,
      message: "Playlist not found or you are not authorized.",
    });
  }

  // 🎉 Success response
  return res.status(201).json({
    success: true,
    message: "Video uploaded and published successfully",
    data: {
      video: {
        id: newVideo._id,
        title: newVideo.title,
        description: newVideo.description,
        tags: newVideo.tags,
        category: newVideo.category,
        privacyStatus: newVideo.privacyStatus,
        allowComments: newVideo.allowComments,
        allowRatings: newVideo.allowRatings,
        language: newVideo.language,
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: newVideo.thumbnail,
        views: newVideo.views,
        likesCount: newVideo.likes?.length || 0,
        dislikesCount: newVideo.dislikes?.length || 0,
        commentsCount: newVideo.comments?.length || 0,
        uploadedAt: newVideo.uploadedAt,
        playlistId,
        channelId: newVideo.channelId,
        ownerId: newVideo.owner,
      },
      playlist: updatedPlaylist,
    },
  });
});


export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid playlist ID",
    });
  }

  const playlist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id }, // Filter
    { $pull: { videos: { videoId } } },       // Update
    { new: true }                             // Options
  );

  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: "Playlist not found or unauthorized",
    });
  }

  return res.status(200).json(
    new ApiResponse(200, playlist, "Video removed from playlist")
  );
});


export  const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid playlist ID",
    });
  }

  // 1. Find the playlist and delete it
  const playlist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: "Playlist not found or unauthorized",
    });
  }

  // 2. Get all videoIds from the deleted playlist
  const videoIds = playlist.videos.map((v) => v.videoId);

  if (videoIds.length > 0) {
    // 3. Delete related videos
    await Video.deleteMany({ _id: { $in: videoIds } });

    // 4. Delete related likes/dislikes
    await Like.deleteMany({ targetId: { $in: videoIds } });

    // 5. Delete related comments
    await Comment.deleteMany({ video: { $in: videoIds } });
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Playlist and all associated data deleted successfully")
  );
});


// Get All Playlists by User
export const getPlaylistsByUser = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({ owner: req.user._id }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

// Get Playlist by ID
export const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid playlist ID",
    });
  }

  const playlist = await Playlist.findById(playlistId)
    .populate({
      path: "videos",
      populate: [
        { path: "owner", select: "_id username avatar" },
        { path: "playlistId", select: "_id name" },       
        
      ],
    });

  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: "Playlist not found",
    });
  }

  // 👇 Enhance each video with likes, dislikes, views, commentsCount
  const enhancedVideos = await Promise.all(
    playlist.videos.map(async (video) => {
      const [likeCount, dislikeCount, commentsCount] = await Promise.all([
        Like.countDocuments({ targetId: video._id, action: "like" }),
        Like.countDocuments({ targetId: video._id, action: "dislike" }),
        Comment.countDocuments({ video: video._id }),
      ]);

      return {
        ...video._doc,
        likeCount,
        dislikeCount,
        commentsCount,
      };
    })
  );

  const fullPlaylist = {
    ...playlist._doc,
    videos: enhancedVideos,
  };

  return res.status(200).json(
    new ApiResponse(200, fullPlaylist, "Playlist with full video details fetched")
  );
});




