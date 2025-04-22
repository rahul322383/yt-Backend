import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 📥 Helper function to validate MongoDB ObjectId
const validateObjectId = (id, type = "Object") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `${type} ID is invalid`);
  }
};

// 📥 Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  validateObjectId(videoId, "Video");

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const newComment = await Comment.create({
    content: content.trim(),
    owner: req.user._id,
    video: videoId,
  });
  console.log(newComment);

  return res.status(201).json(new ApiResponse(201, newComment, "Comment added successfully"));
});

// 📄 Get all comments on a video (paginated)
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = Math.max(1, parseInt(req.query.limit)) || 10;

  validateObjectId(videoId, "Video");

  // Optimized pagination using aggregation
  const [commentsData] = await Comment.aggregate([
    { $match: { video: mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "users", 
        localField: "owner", 
        foreignField: "_id", 
        as: "ownerDetails"
      },
    },
    { $unwind: "$ownerDetails" },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $project: {
        content: 1,
        createdAt: 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ]);

  const totalComments = await Comment.countDocuments({ video: videoId });
  const totalPages = Math.ceil(totalComments / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      comments: commentsData,
      totalComments,
      page,
      limit,
      totalPages,
    }, "Comments retrieved successfully")
  );
});

// ✏️ Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  validateObjectId(commentId, "Comment");

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content cannot be empty");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (!comment.owner.equals(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You are not authorized to edit this comment");
  }

  comment.content = content.trim();
  await comment.save();

  return res.status(200).json(
    new ApiResponse(200, comment, "Comment updated successfully")
  );
});

// ❌ Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  validateObjectId(commentId, "Comment");

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const isOwner = comment.owner.equals(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await comment.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export {
  addComment,
  getVideoComments,
  updateComment,
  deleteComment,
};
