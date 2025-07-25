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
import Channel from "../models/channel.model.js";
import { User } from "../models/user.model.js";
import {Subscription} from "../models/subscription.model.js";
import { sendNotification } from "../utils/SendNotification.js";

// 🔹 GET all videos

export const getAllVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { page = 1, limit = 10, search = "" } = req.query;

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;

  const searchFilter = search
    ? { title: { $regex: search, $options: "i" } }
    : {};

  // 1. Get user’s uploaded vids
  const userVideos = await Video.find({
    ...searchFilter,
    owner: userId,
  })
    .populate("owner", "username avatar")
    .lean();

  // 2. Get user’s playlists
  const userPlaylists = await Playlist.find({ owner: userId }).lean();

  // 3. Map videoId => array of playlists (because a vid can be in multiple playlists)
  const playlistVideoMap = {};
  userPlaylists.forEach((playlist) => {
    (playlist.videos || []).forEach((v) => {
      const vid = String(v.videoId);
      if (!playlistVideoMap[vid]) playlistVideoMap[vid] = [];
      playlistVideoMap[vid].push({
        playlistId: String(playlist._id),
        playlistName: playlist.name,
      });
    });
  });

  // 4. Get all playlist video IDs
  const playlistVideoIds = Object.keys(playlistVideoMap);

  // 5. Get playlist videos (with owner info)
  const playlistVideos = await Video.find({
    ...searchFilter,
    _id: { $in: playlistVideoIds },
  })
    .populate("owner", "username avatar")
    .lean();

  // 6. Combine all videos uniquely + add playlist info and like counts
  const combinedMap = new Map();

  [...userVideos, ...playlistVideos].forEach((video) => {
    const videoId = String(video._id);

    // Add playlist data if exists
    if (playlistVideoMap[videoId]) {
      video.playlistInfo = playlistVideoMap[videoId];
    }

    video.likeCount = video.likes?.length || 0;

    combinedMap.set(videoId, video);
  });

  const allVideos = Array.from(combinedMap.values());

  // 7. Paginate in-memory (start & end indices)
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;
  const paginatedVideos = allVideos.slice(start, end);

  return res.status(200).json(
    new ApiResponse(
      200,
      { videos: paginatedVideos, total: allVideos.length },
      "Videos fetched successfully"
    )
  );
});



 // make sure this import exists

 export const publishAVideo = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { title, description, tags, isPublished = true } = req.body;
  const videoFile = req.files?.video?.[0]; // spelling consistency 👀


  if(!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json(
      new ApiResponse(400, {}, "The provided playlist ID is invalid. Please ensure it follows the correct format.")
    );
  }

  // Required fields check
  if (!title) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Title is required"));
  }

  if (!videoFile) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Video file is required"));
  }

  // Find user's channel
  // const channel = await Channel.findOne({ user: req.user._id });
  // if (!channel) {
  //   return res
  //     .status(404)
  //     .json(new ApiResponse(404, null, "Channel not found for this user"));
  // }

  // Upload to Cloudinary

  const videoUpload = await uploadOnCloudinary(videoFile.path, "video");
  if (!videoUpload?.url) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Video upload to Cloudinary failed"));
  }

  const videoId= new mongoose.Types.ObjectId().toHexString();


  // Create video document
  const newVideo = await Video.create({
    title,
    description,
    tags: tags ? tags.split(",").map(tag => tag.trim()) : [],
    playlistId,
    channelId:req.user.channelId,
    videoUrl: videoUpload.url,
    cloudinaryId: videoUpload.public_id,
    owner: req.user._id,
    isPublished,
    duration: videoUpload.duration,
    size: videoUpload.bytes,
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






export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new ApiResponse(400, {}, "Invalid video ID format"));
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!video) {
    return res.status(404).json(new ApiResponse(404, {}, "Video not found"));
  }

  // ✅ Track user watch history
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { watchHistory: video._id },
        $set: { lastWatchedAt: new Date() },
      },
      { new: true }
    );
  }

  const playlist = await Playlist.findOne({ "videos.videoId": videoId });
  if (!playlist) {
    return res.status(404).json(new ApiResponse(404, {}, "Video not found in any playlist"));
  }

  const embeddedVideo = playlist.videos.find(v => String(v.videoId) === videoId);
  if (!embeddedVideo) {
    return res.status(404).json(new ApiResponse(404, {}, "Video not found inside the playlist"));
  }

  const channel = await User.findOne({ channelId: video.channelId })
    .select("channelId fullName avatar")
    .lean();

  const [likesCount, dislikesCount, commentsCount] = await Promise.all([
    Like.countDocuments({ video: video._id, action: "like" }),
    Like.countDocuments({ video: video._id, action: "dislike" }),
    Comment.countDocuments({ video: video._id }),
  ]);

  const videoData = {
    _id: video._id,
    title: embeddedVideo.title || video.title,
    thumbnail: embeddedVideo.thumbnail || video.thumbnail,
    videoUrl: embeddedVideo.videoUrl || video.videoUrl,
    description: embeddedVideo.description || video.description || "",
    duration: embeddedVideo.duration || video.duration,
    views: video.views,
    likeCount: likesCount,
    dislikeCount: dislikesCount,
    commentCount: commentsCount,
    tags: embeddedVideo.tags || video.tags || [],
    playlistId: playlist._id,
    playlistName: playlist.name,
    channelId: video.channelId,
    creatorName: channel?.fullName || "Unknown Creator",
    avatarUrl: channel?.avatar || null,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    isPublished: video.isPublished,
  };

  const playlistVideoIds = playlist.videos.map(v => new mongoose.Types.ObjectId(v.videoId));

  const [playlistVideos, likeAgg] = await Promise.all([
    Video.find({ _id: { $in: playlistVideoIds } }).lean(),
    Like.aggregate([
      { $match: { video: { $in: playlistVideoIds } } },
      {
        $group: {
          _id: { video: "$video", action: "$action" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const likesMap = {};
  for (const item of likeAgg) {
    const vid = String(item._id.video);
    if (!likesMap[vid]) likesMap[vid] = { likeCount: 0, dislikeCount: 0 };

    if (item._id.action === "like") likesMap[vid].likeCount = item.count;
    else if (item._id.action === "dislike") likesMap[vid].dislikeCount = item.count;
  }

  const channelIds = [...new Set(playlistVideos.map(v => v.channelId))];
  const channels = await User.find({ channelId: { $in: channelIds } }).select("channelId fullName avatar").lean();

  const channelMap = {};
  for (const ch of channels) {
    channelMap[ch.channelId] = ch;
  }

  const formattedPlaylistVideos = playlist.videos.map(v => {
    const videoDoc = playlistVideos.find(doc => String(doc._id) === String(v.videoId));
    const likeInfo = likesMap[String(videoDoc?._id)] || { likeCount: 0, dislikeCount: 0 };
    const channelInfo = channelMap[videoDoc?.channelId];

    return {
      _id: videoDoc?._id || v.videoId,
      title: v.title || videoDoc?.title,
      thumbnail: v.thumbnail || videoDoc?.thumbnail,
      videoUrl: v.videoUrl || videoDoc?.videoUrl,
      duration: v.duration || videoDoc?.duration,
      views: videoDoc?.views || 0,
      likeCount: likeInfo.likeCount,
      dislikeCount: likeInfo.dislikeCount,
      commentCount: 0,
      channelId: videoDoc?.channelId,
      creatorName: channelInfo?.fullName || "Unknown Creator",
      avatarUrl: channelInfo?.avatar || null,
      isPublished: videoDoc?.isPublished ?? true,
      createdAt: videoDoc?.createdAt,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        video: videoData,
        playlistVideos: formattedPlaylistVideos,
      },
      "Video details fetched successfully"
    )
  );
});









export const playVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || videoId === "undefined") {
    return res.status(400).json(new ApiResponse(400, null, "Video ID is required and must be valid"));
  }

  try {
    // Fetch video, populate playlist info if needed
    const video = await Video.findById(videoId).populate('playlistId');

    if (!video) {
      return res.status(404).json(new ApiResponse(404, null, "Video not found"));
    }

    // Prepare response data, add totalLikes count if you store likes as array or number
    const videoObj = video.toObject();

    // Example: if likes stored as array of userIds
    videoObj.likesCount = Array.isArray(video.likes) ? video.likes.length : (video.likes || 0);

    // Remove user-specific info if any (optional)
    delete videoObj.likes; // if you don't want to expose the full likes array

    return res.status(200).json(new ApiResponse(200, videoObj, "Video details fetched successfully"));
  } catch (err) {
    console.error("❌ DB error in playVideoById:", err);
    return res.status(500).json(new ApiResponse(500, null, "Error fetching video by ID"));
  }
});







// 🔹 UPDATE video info
export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const updates = req.body;

  // if (req.file) {
  //   const thumbUpload = await uploadOnCloudinary(req.file.path, "image");
  //   updates.thumbnail = thumbUpload.url;
  // }

  const updated = await Video.findOneAndUpdate({ _id :videoId }, updates, { new: true });

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

  // Step 1: Find the video by ID
  const video = await Video.findById(videoId);
  if (!video) {
    return res.status(404).json({
      success: false,
      message: "❌ Video not found",
    });
  }

  // Step 2: Remove video from all playlists
  const playlistUpdate = await Playlist.updateMany(
    {},
    { $pull: { videos: { videoId: videoId } } }
  );
 

  // Step 3: Delete video from Cloudinary
  const cloudinaryId = video.cloudinaryId || extractCloudinaryPublicId(video.videoUrl);
  if (cloudinaryId) {
    await cloudinary.uploader.destroy(cloudinaryId, {
      resource_type: "video",
    });
  
  } else {
    console.warn("⚠ Cloudinary ID not found, skipping cloud deletion.");
  }

  // Step 4: Delete from MongoDB
  await Video.findByIdAndDelete(videoId);
 

  // Step 5: Respond to client
  return res.status(200).json(
    new ApiResponse(200, null, "✅ Video deleted from MongoDB, playlists, and Cloudinary.")
  );
});



export const getAndTrackVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid video ID format"));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // ✅ Step 1: Find and update video views
    const video = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      {
        new: true,
        session,
        select: "-__v",
      }
    )
      .populate("owner", "username avatar channelId")
      .exec();
    
    if (!video) {
      await session.abortTransaction();
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Video not found"));
    }

    let isSubscribed = false;
    let isInWatchLater = false;

    // ✅ Step 2: Track watch history if logged in
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).session(session);

      if (user) {
        // Avoid duplicates
        const alreadyWatched = user.watchHistory.some(
          (id) => id.toString() === video._id.toString()
        );

        if (!alreadyWatched) {
          user.watchHistory.push(video._id);
        }

        user.lastWatchedAt = new Date();
        await user.save({ session });
     

        isSubscribed = user.subscribedChannels?.includes(
          video.owner?.channelId
        );

        isInWatchLater = user.watchLater?.includes(videoId);
      }
    }

    // ✅ Step 3: Get like/dislike/comment count
    const [likeCount, dislikeCount, commentCount] = await Promise.all([
      Like.countDocuments({ video: videoId, action: "like" }),
      Like.countDocuments({ video: videoId, action: "dislike" }),
      Comment.countDocuments({ video: videoId }),
    ]);

    // ✅ Step 4: Build response
    const responseData = {
      _id: video._id,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnail: video.thumbnail,
      duration: video.duration,
      tags: video.tags,
      views: video.views, // already incremented
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      channelId: video.channelId,
      avatarUrl: video.owner?.avatar || null,
      creatorName: video.owner?.username || "Unknown",
      isPublished: video.isPublished,
      isOwner: userId && String(userId) === String(video.owner?._id),
      isSubscribed,
      isInWatchLater,
      likeCount,
      dislikeCount,
      commentCount,
    };

    await session.commitTransaction();

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, "Video fetched successfully"));
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error in getAndTrackVideo:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch video details"));
  } finally {
    session.endSession();
  }
});








export const likeVideos = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!videoId || !userId) {
    return res.status(400).json({ msg: "Video ID and User ID are required" });
  }

  try {
    const video = await Video.findById(videoId).populate({
      path: "user",
      select: "_id username",
    });

    if (!video) {
      return res.status(404).json({ msg: "Video not found" });
    }

    const alreadyLiked = video.likes.includes(userId.toString());

    if (alreadyLiked) {
      video.likes = video.likes.filter(id => id.toString() !== userId.toString());
    } else {
      video.likes.push(userId.toString());

      if (video.user && video.user._id.toString() !== userId.toString()) {
        try {
          sendNotification(
            req.app,
            video.user._id.toString(),
            `Your video "${video.title}" got a new like ❤️`
          );
        } catch (notifyErr) {
          console.error("Notification error:", notifyErr.message);
        }
      }
    }

    await video.save();

    return res.status(200).json({
      msg: alreadyLiked ? "Like removed" : "Liked and notification sent",
      likesCount: video.likes.length,
    });
  } catch (err) {
    console.error("Error liking video:", err.message);
    return res.status(500).json({ msg: "Internal error" });
  }
};



