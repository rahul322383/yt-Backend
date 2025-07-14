import mongoose from "mongoose";
import Short from "../models/Short.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../models/comment.model.js";

// 🔥 GET ALL VIDEOS (with like/comment/share counts)
export const getAllVideos = async (req, res) => {
  try {
    const videos = await Short.find().sort({ createdAt: -1 }).lean();
    const videoIds = videos.map((v) => v._id);

    const commentCounts = await Comment.aggregate([
      { $match: { videoId: { $in: videoIds } } },
      { $group: { _id: "$videoId", count: { $sum: 1 } } },
    ]);

    const commentsMap = {};
    commentCounts.forEach((c) => {
      commentsMap[c._id.toString()] = c.count;
    });

    const enriched = videos.map((video) => ({
      ...video,
      likeCount: video.likes?.length || 0,
      shareCount: video.shares || 0,
      commentCount: commentsMap[video._id.toString()] || 0,
    }));

    res.status(200).json(enriched);
  } catch (err) {
    console.error("❌ Error fetching videos:", err);
    res.status(500).json({ message: "Server error while fetching videos" });
  }
};

// 💖 LIKE / UNLIKE VIDEO
export const likeVideo = async (req, res) => {
  try {
    const video = await Short.findById(req.params.id);
    const userId = req.user._id.toString();

    if (!video) return res.status(404).json({ message: "Video not found" });

    if (!video.likes.includes(userId)) {
      video.likes.push(userId);
    } else {
      video.likes = video.likes.filter((id) => id.toString() !== userId);
    }

    await video.save();
    res.status(200).json({
      message: "Like toggled",
      likesCount: video.likes.length,
      likes: video.likes,
    });
  } catch (err) {
    console.error("❌ Like error:", err);
    res.status(500).json({ message: err.message });
  }
};

// 📤 CREATE VIDEO
export const createVideo = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Video file is required" });

    const result = await uploadOnCloudinary(file.path);
    if (!result?.url) return res.status(500).json({ message: "Cloudinary upload failed" });

    const video = new Short({
      uploadedBy: req.user.username || "Anonymous",
      userId: req.user._id,
      title: req.body.title,
      tags: req.body.tags?.split(",") || [],
      videoUrl: result.url,
      cloudinaryId: result.public_id,
    });

    const saved = await video.save();
    res.status(201).json({ message: "Uploaded", video: saved });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// 🛠️ UPDATE VIDEO
export const updateVideo = async (req, res) => {
  try {
    const video = await Short.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (video.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updated = await Short.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ❌ DELETE VIDEO
export const deleteVideo = async (req, res) => {
  const { id: videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }

  if (!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log("User ID:", req.user._id);
  console.log("Video ID:", videoId);
  console.log("Video User ID:", req.user._id.toString());
  

  try {
    const video = await Short.findById(videoId);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // ✅ Fix here: comparing ObjectIds as strings
    if (video.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can delete only your own video" });
    }

    // 🧹 Delete from Cloudinary if exists
    if (video.cloudinaryId) {
      await cloudinary.uploader.destroy(video.cloudinaryId);
    }

    // 🗑️ Delete from MongoDB
    const deleted = await Short.findByIdAndDelete(videoId);
    if (!deleted) return res.status(404).json({ message: "Video not found" });

    res.status(200).json({ message: "Video has been deleted" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ message: err.message });
  }
};



// 🎥 GET SINGLE VIDEO
export const getVideo = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    const video = await Short.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    res.status(200).json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 👁️ INCREMENT VIEW
export const addView = async (req, res) => {
  try {
    await Short.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.status(200).json({ message: "View increased" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📈 TRENDING VIDEOS
export const trend = async (req, res) => {
  try {
    const videos = await Short.find().sort({ views: -1 }).limit(40);
    if (!videos.length) return res.status(404).json({ message: "No trending videos" });
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🎲 RANDOM VIDEOS
export const random = async (req, res) => {
  try {
    const videos = await Short.aggregate([{ $sample: { size: 40 } }]);
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🏷️ VIDEOS BY TAGS
export const getByTag = async (req, res) => {
  try {
    const tags = req.query.tags?.split(",") || [];
    const videos = await Short.find({ tags: { $in: tags } }).limit(20);
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔍 SEARCH BY TITLE
export const search = async (req, res) => {
  try {
    const query = req.query.q || "";
    const videos = await Short.find({
      title: { $regex: query, $options: "i" },
    }).limit(40);
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
