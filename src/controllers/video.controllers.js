import {asyncHandler} from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import cloudinary from "../utils/cloudinary.config.js";
import {Comment} from "../models/comment.model.js";
import { Like } from "../models/like.model.js";

// 🔹 GET all videos

export const getAllVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id; // Auth middleware should add this
  const { page = 1, limit = 10, search = "" } = req.query;

  const searchFilter = search
    ? { title: { $regex: search, $options: "i" } }
    : {};

  // 1. Get user's directly uploaded videos
  const userVideos = await Video.find({
    ...searchFilter,
    owner: userId,
  });

  // 2. Get user's playlists
  const userPlaylists = await Playlist.find({ owner: userId }).lean();
  const playlistVideoIds = userPlaylists.flatMap((playlist) =>
    playlist.videos?.map((v) => v.videoId) || []
  );

  // 3. Get videos from playlists
  const playlistVideos = await Video.find({
    ...searchFilter,
    _id: { $in: playlistVideoIds },
  });

  // 4. Combine and remove duplicates
  const combinedMap = new Map();
  [...userVideos, ...playlistVideos].forEach((video) => {
    combinedMap.set(String(video._id), video);
  });

  const allVideos = Array.from(combinedMap.values());

  // 5. Paginate
  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginatedVideos = allVideos.slice(start, end);

  return res.status(200).json(
    new ApiResponse(
      200,
      { videos: paginatedVideos, total: allVideos.length },
      "Videos fetched successfully"
    )
  );
});


// 🔹 PUBLISH/UPLOAD a video

export const publishAVideo = asyncHandler(async (req, res) => {
  const {
    title,
     } = req.body;

  const videoFile = req.files?.videoFile?.[0];
 

  // Validation
  if (!title || !videoFile ) {
    return res.status(400).json(new ApiResponse(400, {}, "Invalid request"));
  }
  // Upload video and thumbnail
  const videoUpload = await uploadOnCloudinary(videoFile.path, "video");
  if (!videoUpload?.url) {
    return res.status(500).json(new ApiResponse(500, {}, "Video upload failed"));
  }

  // Create video document
  const newVideo = await Video.create({
    videoId: videoUpload.public_id,
    title,
    videoUrl: videoUpload.url,
    owner: req.user._id,
    isPublished,
    cloudinaryId: videoUpload?.public_id || undefined,
    // videoId is auto-generated using uuidv4 in schema
    
  })

  return res.status(201).json(
    new ApiResponse(201, newVideo, "Video uploaded and published successfully")
  );
});



export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const playlist = await Playlist.findOne({ "videos.videoId": videoId });

  if (!playlist) {
    return res.status(404).json(new ApiResponse(404, {}, "Video not found"));
  }

  const video = playlist.videos.find((v) => v.videoId === videoId);
  if (!video) {
    return res.status(404).json(new ApiResponse(404, {}, "Video not found in playlist"));
  }

  // Increment view count (optional)
  video.views = (video.views || 0) + 1;
  await playlist.save();

  // Fetch likes and comments
  const [likes, comments] = await Promise.all([
    Like.find({ video: videoId, likedBy: { $exists: true } }),
    Comment.find({ video: videoId }).populate("owner", "username avatar")
  ]);

  const likeCount = likes.length;

  const videoData = {
    videoId: video.videoId,
    title: video.title,
    description: video.description,
    url: video.url,
    views: video.views,
    likes: likeCount,
    comments,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };

  return res.status(200).json(
    new ApiResponse(200, videoData, "Video details fetched successfully")
  );
});




// 🔹 STREAM video

export const playVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      message: "Video not found",
      data: null,
    });
  }

  // If video found, respond with video data
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Video found",
    data: video,
  });
});



// 🔹 UPDATE video info
export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const updates = req.body;

  if (req.file) {
    const thumbUpload = await uploadOnCloudinary(req.file.path, "image");
    updates.thumbnail = thumbUpload.url;
  }

  const updated = await Video.findOneAndUpdate({ videoId }, updates, { new: true });

  if (!updated)
    return res.status(404).json(new ApiResponse(404, {}, "Video not found"));

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Video updated successfully"));
});


// 🔹 TOGGLE publish status
export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById( videoId );

  if (!video) 
    return res.status(404).json(new ApiResponse(404, {}, "Video not found"));
  video.status = video.status === "published" ? "unpublished" : "published";
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, `Video is now ${video.status}`));
});



const extractCloudinaryPublicId = (url) => {
  try {
    const parts = url.split('/');
    const fileName = parts.pop();             // e.g., rz7vtufjvcvzwtlxmdje.mp4
    const version = parts.pop();              // e.g., v1744729768
    const publicId = `${version}/${fileName.split('.')[0]}`; // e.g., v1744729768/rz7vtufjvcvzwtlxmdje
    return publicId;
  } catch (error) {
    return null;
  }
};

export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // 1. Delete from MongoDB (Video collection)
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    return res.status(404).json({
      success: false,
      message: "❌ Video not found",
    });
  }

  // 2. Remove video from all playlists
  const removesvideos =await Playlist.updateMany(
    {},
    {
      $pull: {
        videos: { videoId: deletedVideo.videoId },
      },
    }
  );
  console.log("Removed video from all playlists:", removesvideos);

  // 3. Delete from Cloudinary
  const cloudinaryId =
    deletedVideo.cloudinaryId || extractCloudinaryPublicId(deletedVideo.videoUrl);
    console.log("Cloudinary ID:", cloudinaryId);

  if (cloudinaryId) {
    await cloudinary.uploader.destroy(cloudinaryId, {
      resource_type: "video",
    });
  } else {
    console.warn("⚠ Cloudinary ID not found, skipping cloud deletion.");
  }

  // 4. Respond to client
  return res.status(200).json(
    new ApiResponse(200, null, "✅ Video deleted from DB, playlists, and Cloudinary.")
  );
});



export const getAndTrackVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new ApiResponse(400, {}, "The provided video ID is invalid. Please provide a valid MongoDB ObjectId."));
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { views: 1 } }, // ✅ increment view count
    { new: true }
  )
    .populate("owner", "username avatar");

    if (!video) {
      return res.status(404).json(
        new ApiResponse(404, {}, "The video with the provided ID could not be found. Please ensure the ID is correct and exists.")
      );
    }
  return res.status(200).json(new ApiResponse(200, video, "Video fetched and view counted"));
});
