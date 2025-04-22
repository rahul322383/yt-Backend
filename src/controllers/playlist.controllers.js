import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import crypto from "crypto"; // add this at the top
import { upload } from "../middleware/multer.middleware.js";
import { Video } from "../models/video.model.js";


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
  const { title, description, isPublished = false } = req.body;
  const videoFile = req.files?.video?.[0];

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json(
      new ApiResponse(400, {}, "The provided playlist ID is invalid. Please ensure it follows the correct format.")
    );
  }

  if (!title) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Title is required for the video")
    );
  }
  
  if (!videoFile) {
    return res.status(400).json(
      new ApiResponse(400, {}, "Video file is required for the upload")
    );
  }
  

  // Upload video to Cloudinary
  const videoUpload = await uploadOnCloudinary(videoFile.path);
  if (!videoUpload?.url) {
    return res.status(500).json(new ApiResponse(500, {}, "Video upload failed"));
   
  }
  // Generate a custom videoId (can be Cloudinary public_id or a new ObjectId)
  const videoId = new mongoose.Types.ObjectId().toHexString();

  // Create global video entry
  const newVideo = await Video.create({
    videoId,
    title,
    description,
    videoUrl: videoUpload.url,
    thumbnail: videoUpload.url,
    owner: req.user._id,
    isPublished,
    likes: 0,
    views: 0,
    dislikes: 0,
    viewedBy: [],
    tags: [],
    comments: [],
    uploadedAt: new Date(),
    playlistRef: playlistId,
  });

  // Add video reference to playlist
  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    {
      $addToSet: {
        videos: {
          videoId: newVideo._id, // Reference to the global video entry
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
      message: "Playlist not found or unauthorized",
     })
    }

     return res.status(201).json(
    new ApiResponse(
      201,
      { videoId: newVideo._id, playlist: updatedPlaylist },
      "Video added to playlist"
    )
  );
});

// Remove Video


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

// Delete Playlist
export const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid playlist ID",
    })
  }

  const playlist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: "Playlist not found or you are not authorized to access it",
    });
  }
  

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist deleted successfully"));
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
    })
  }

  const playlist = await Playlist.findById(playlistId).populate("videos.videoId");
  if (!playlist) {
    return res.status(404).json({
      success: false,
      message: "Playlist not found or InvalidId",
      data: null,
    });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});


