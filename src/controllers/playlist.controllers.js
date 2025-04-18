// // import {asyncHandler} from "../utils/asyncHandler.js";
// // import { Playlist } from "../models/playlist.model.js";
// // import { ApiError } from "../utils/ApiError.js";
// // import { ApiResponse } from "../utils/ApiResponse.js";
// // import mongoose from "mongoose";
// // import { uploadOnCloudinary } from "../utils/cloudinary.js";
// // import { upload } from "../middleware/multer.middleware.js";

// // // Create a new playlist
// // export const createPlaylist = asyncHandler(async (req, res) => {
// //   const { name, description } = req.body;

// //   if (!name || !description) {
// //     throw new ApiError(400, "Name and description are required");
// //   }

// //   const playlist = await Playlist.create({
// //     name,
// //     description,
// //     owner: req.user._id,
// //   });

// //   return res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully"));
// // });

// // // Update playlist details
// // export const updatePlaylist = asyncHandler(async (req, res) => {
// //   const { playlistId } = req.params;
// //   const { name, description } = req.body;

// //   const playlist = await Playlist.findOneAndUpdate(
// //     { _id: playlistId, owner: req.user._id },
// //     { $set: { name, description } },
// //     { new: true }
// //   );

// //   if (!playlist) {
// //     throw new ApiError(404, "Playlist not found or unauthorized");
// //   }

// //   return res.status(200).json(new ApiResponse(200, playlist, "Playlist updated successfully"));
// // });

// // export const addVideoToPlaylist = asyncHandler(async (req, res) => {
// //   const { videoId, title, videoRef } = req.body;
// //   const videoFile = req.files?.video?.[0];

// //   console.log("BODY:", req.body);
// //   console.log("FILES:", req.files);

// //   if (!videoId || !title || !videoRef || !videoFile) {
// //     throw new ApiError(400, "videoId, title, videoRef, and video file are required");
// //   }

// //   // upload to Cloudinary
// //   const uploadedVideoUrl = await uploadOnCloudinary(videoFile.path);
// //   if (!uploadedVideoUrl) {
// //     throw new ApiError(500, "Video upload failed");
// //   }

// //   const playlist = await Playlist.findOneAndUpdate(
// //     { _id: req.params.playlistId, owner: req.user._id },
// //     {
// //       $addToSet: {
// //         videos: { videoId, videoRef, title, url: uploadedVideoUrl }
// //       }
// //     },
// //     { new: true }
// //   );

// //   if (!playlist) {
// //     throw new ApiError(404, "Playlist not found");
// //   }

// //   return res.status(201).json(new ApiResponse(201, playlist, "Video added to playlist"));
// // });


// // // export const addVideoToPlaylist = async (req, res, next) => {
// // //   try {
// // //     const { playlistId } = req.params;
// // //     const { videoId, title, videoRef } = req.body;

// // //     const videoFile = req.files?.video?.[0];

// // //     if (!videoId || !title || !videoRef || !videoFile) {
// // //       throw new ApiError(400, "videoId, title, videoRef, and video file are required");
// // //     }

// // //     console.log("videoId", videoId);
// // //     console.log("title", title);
// // //     console.log("videoRef", videoRef);
// // //     console.log("playlistId", playlistId);
// // //     console.log("videoFile", videoFile);

// // //     // Proceed to upload videoFile to Cloudinary or whatever storage you're using
// // //     // Save video metadata to DB and link to playlist...

// // //     res.status(201).json({
// // //       success: true,
// // //       message: "Video added to playlist",
// // //       data: {
// // //         videoId,
// // //         title,
// // //         videoRef,
// // //         fileInfo: videoFile
// // //       }
// // //     });
// // //   } catch (error) {
// // //     next(error);
// // //   }
// // // };


// // // Remove video from playlist
// // export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
// //   const { playlistId, videoId } = req.params;

// //   const playlist = await Playlist.findOneAndUpdate(
// //     { _id: playlistId, owner: req.user._id },
// //     {
// //       $pull: {
// //         videos: { videoId }
// //       }
// //     },
// //     { new: true }
// //   );

// //   if (!playlist) {
// //     throw new ApiError(404, "Playlist not found or unauthorized");
// //   }

// //   return res.status(200).json(new ApiResponse(200, playlist, "Video removed from playlist"));
// // });

// // // Delete a playlist
// // export const deletePlaylist = asyncHandler(async (req, res) => {
// //   const { playlistId } = req.params;

// //   const playlist = await Playlist.findOneAndDelete({
// //     _id: playlistId,
// //     owner: req.user._id
// //   });

// //   if (!playlist) {
// //     throw new ApiError(404, "Playlist not found or unauthorized");
// //   }

// //   return res.status(200).json(new ApiResponse(200, playlist, "Playlist deleted successfully"));
// // });

// // // Get all playlists by user
// // export const getPlaylistsByUser = asyncHandler(async (req, res) => {
// //   const playlists = await Playlist.find({ owner: req.user._id }).sort({ createdAt: -1 });

// //   return res.status(200).json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
// // });

// // // Get playlist by ID
// // export const getPlaylistById = asyncHandler(async (req, res) => {
// //   const { playlistId } = req.params;

// //   if (!mongoose.Types.ObjectId.isValid(playlistId)) {
// //     throw new ApiError(400, "Invalid playlist ID");
// //   }

// //   const playlist = await Playlist.findById(playlistId).populate("videos.videoRef");

// //   if (!playlist) {
// //     throw new ApiError(404, "Playlist not found");
// //   }

// //   return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
// // });


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

  if (!name || !description) {
    throw new ApiError(400, "Name and description are required");
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
    throw new ApiError(400, "Invalid playlist ID");
  }

  const updated = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user._id },
    { $set: { name, description } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(404, "Playlist not found or unauthorized");
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
    throw new ApiError(400, "Invalid playlist ID");
  }

  if (!title || !videoFile) {
    throw new ApiError(400, "Title and video file are required");
  }

  // Upload video to Cloudinary
  const videoUpload = await uploadOnCloudinary(videoFile.path);
  if (!videoUpload?.url) {
    throw new ApiError(500, "Video upload failed");
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
    throw new ApiError(404, "Playlist not found or unauthorized");
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      { videoId: newVideo._id, playlist: updatedPlaylist },
      "Video added to playlist"
    )
  );
});


// export const addVideoToPlaylist = asyncHandler(async (req, res) => {
//   const { playlistId } = req.params;
//   const title = req.body.title;
//   const videoId = new mongoose.Types.ObjectId().toHexString(); // ✅ Auto-generate hex ID
//   const videoFile = req.files?.video?.[0];

//   if (!mongoose.Types.ObjectId.isValid(playlistId)) {
//     throw new ApiError(400, "Invalid playlist ID");
//   }

//   if (!title || !videoFile) {
//     throw new ApiError(400, "Title and video file are required");
//   }

//   // Upload video to Cloudinary
//   const uploadedVideo = await uploadOnCloudinary(videoFile.path);
//   if (!uploadedVideo?.url) {
//     throw new ApiError(500, "Video upload failed");
//   }

//   // Add video to playlist
//   const updatedPlaylist = await Playlist.findOneAndUpdate(
//     { _id: playlistId, owner: req.user._id },
//     {
//       $addToSet: {
//         videos: {
//           videoId,
//           title,
//           url: uploadedVideo.url,
//           uploadedAt: new Date(),
//         },
//       },
//     },
//     { new: true }
//   );

//   if (!updatedPlaylist) {
//     throw new ApiError(404, "Playlist not found or unauthorized");
//   }

//   // Also save the video to global Video collection
//   await Video.create({
//     videoId,
//     title,
//     videoUrl: uploadedVideo.url, // match the Video model field name
//     owner: req.user._id,
//     playlistRef: playlistId,
//     uploadedAt: new Date(),
//   });

//   return res.status(201).json(
//     new ApiResponse(201, { videoId, playlist: updatedPlaylist }, "Video added to playlist")
//   );
// });








// Remove Video


export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const {  videoId } = req.params;
  
  // if (!mongoose.Types.ObjectId.isValid(playlistId)) {
  //   throw new ApiError(400, "Invalid playlist ID");
  // }

  const playlist = await Playlist.findOneAndUpdate(
    // { _id: playlistId, owner: req.user._id },
    { $pull: { videos: { videoId } } },
    { new: true }
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist not found or unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

// Delete Playlist
export const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
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
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findById(playlistId).populate("videos.videoId");

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});


