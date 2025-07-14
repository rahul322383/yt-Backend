import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "mongoose";

const validateObjectId = (id, resourceName = "Resource") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }
  return true;
};

// 📝 Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!validateObjectId(videoId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Video ID"));
  }

  if (!content?.trim()) {
    return res.status(400).json(new ApiResponse(400, null, "Comment content is required"));
  }

  const newComment = await Comment.create({
    content: content.trim(),// after testing remove trim
    owner: req.user._id,
    video: videoId,
  });

  return res.status(201).json(
    new ApiResponse(201, newComment, "Comment added successfully")
  );
});




// 📄 Get all comments for a video (paginated)
// const getVideoComments = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;
//   const page = Math.max(1, parseInt(req.query.page)) || 1;
//   const limit = Math.max(1, parseInt(req.query.limit)) || 10;

//   if (!validateObjectId(videoId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Video ID"));
//   }

//   const commentsData = await Comment.aggregate([
//     { $match: { video: new mongoose.Types.ObjectId(videoId), isDeleted: false } },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "ownerDetails",
//       },
//     },
//     { $unwind: "$ownerDetails" },
//     { $sort: { createdAt: -1 } },
//     { $skip: (page - 1) * limit },
//     { $limit: limit },
//     {
//       $project: {
//         content: 1,
//         createdAt: 1,
//         likes: { $size: "$likes" },
//         "ownerDetails.username": 1,
//         "ownerDetails.avatar": 1,
//       },
//     },
//   ]);

//   const totalComments = await Comment.countDocuments({
//     video: videoId,
//     isDeleted: false,
//   });

//   return res.status(200).json(
//     new ApiResponse(200, {
//       comments: commentsData,
//       totalComments,
//       page,
//       limit,
//       totalPages: Math.ceil(totalComments / limit),
//     }, "Comments retrieved successfully")
//   );
// });



const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = Math.max(1, parseInt(req.query.limit)) || 10;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Video ID"));
  }

  const commentsData = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
        isDeleted: false,
        parentComment: null,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    { $unwind: "$ownerDetails" },
    {
      $lookup: {
        from: "comments",
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$parentComment", "$$commentId"] },
              isDeleted: false,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "replyOwnerDetails",
            },
          },
          { $unwind: "$replyOwnerDetails" },
          {
            $addFields: {
              likesCount: { $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0] },
              dislikesCount: { $cond: [{ $isArray: "$dislikes" }, { $size: "$dislikes" }, 0] },
              isLikedByUser: userId
                ? { $in: [userId, { $ifNull: ["$likes", []] }] }
                : false,
              isDislikedByUser: userId
                ? { $in: [userId, { $ifNull: ["$dislikes", []] }] }
                : false,
            },
          },
          {
            $project: {
              content: 1,
              createdAt: 1,
              likesCount: 1,
              dislikesCount: 1,
              isLikedByUser: 1,
              isDislikedByUser: 1,
              "replyOwnerDetails.username": 1,
              "replyOwnerDetails.avatar": 1,
            },
          },
        ],
        as: "replies",
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $addFields: {
        likesCount: { $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0] },
        dislikesCount: { $cond: [{ $isArray: "$dislikes" }, { $size: "$dislikes" }, 0] },
        isLikedByUser: userId
          ? { $in: [userId, { $ifNull: ["$likes", []] }] }
          : false,
        isDislikedByUser: userId
          ? { $in: [userId, { $ifNull: ["$dislikes", []] }] }
          : false,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        dislikesCount: 1,
        isLikedByUser: 1,
        isDislikedByUser: 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
        replies: 1,
      },
    },
  ]);

  const totalComments = await Comment.countDocuments({
    video: videoId,
    parentComment: null,
    isDeleted: false,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments: commentsData,
        totalComments,
        page,
        limit,
        totalPages: Math.ceil(totalComments / limit),
      },
      "Comments retrieved successfully"
    )
  );
});




// ✏️ Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!validateObjectId(commentId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
  }

  if (!content?.trim()) {
    return res.status(400).json(new ApiResponse(400, null, "Comment content cannot be empty"));
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
  }

  if (!comment.owner.equals(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json(new ApiResponse(403, null, "Not authorized to edit this comment"));
  }

  comment.content = content.trim();
  await comment.save();

  return res.status(200).json(
    new ApiResponse(200, comment, "Comment updated successfully")
  );
});

// ❌ Soft delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!validateObjectId(commentId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
  }

  const isOwner = comment.owner.equals(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json(new ApiResponse(403, null, "Not authorized to delete this comment"));
  }

  comment.isDeleted = true;
  comment.content = "[deleted]";
  await comment.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Comment deleted successfully")
  );
});

// ❤️ Like or unlike a comment
const toggleLikeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!validateObjectId(commentId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
  }

  const userId = req.user._id;
  const hasLiked = comment.likes.includes(userId);

  if (hasLiked) {
    comment.likes.pull(userId);
  } else {
    comment.likes.push(userId);
  }

  await comment.save();

  return res.status(200).json(
    new ApiResponse(200, {
      liked: !hasLiked,
      totalLikes: comment.likes.length,
    }, hasLiked ? "Comment unliked" : "Comment liked")
  );
});

// 💬 Reply to a comment
const replyToComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // Validate Comment ID
  if (!validateObjectId(commentId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
  }

  // Validate Reply Content
  if (!content || !content.trim()) {
    return res.status(400).json(new ApiResponse(400, null, "Reply content is required"));
  }

  // Check if parent comment exists and is not deleted
  const parentComment = await Comment.findById(commentId);
  if (!parentComment || parentComment.isDeleted) {
    return res.status(404).json(new ApiResponse(404, null, "Parent comment not found"));
  }

  // Create reply comment
  const reply = await Comment.create({
    content: content.trim(),
    owner: req.user._id,
    video: parentComment.video,
    parentComment: parentComment._id,
  });

  // Populate owner field (username and avatar)
  const populatedReply = await Comment.findById(reply._id).populate("owner", "username avatar");

  return res.status(201).json(
    new ApiResponse(201, populatedReply, "Reply added successfully")
  );
});



export const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUser = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid user ID"));
  }

  const user = await User.findById(currentUser);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  if (user.blockedUsers.includes(userId)) {
    return res.status(400).json(new ApiResponse(400, null, "User already blocked"));
  }

  user.blockedUsers.push(userId);
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, "User blocked successfully"));
});

export const reportComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
  }

  // Check if already reported by user
  if (comment.reportedBy.includes(userId)) {
    return res.status(400).json(new ApiResponse(400, null, "Already reported"));
  }

  comment.reportedBy.push(userId);
  await comment.save();

  return res.status(200).json(new ApiResponse(200, null, "Comment reported"));
});


export const getReportedComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ reportedBy: { $exists: true, $not: { $size: 0 } } })
    .populate("owner", "username avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({ data: comments });
});




export {
  addComment,
  getVideoComments,
  updateComment,
  deleteComment,
  toggleLikeComment,
  replyToComment,
};



// import mongoose from "mongoose";
// import { Comment } from "../models/comment.model.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// // 🔍 Validate MongoDB ObjectId
// const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// // 📝 Add a comment to a video
// const addComment = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;
//   const { content } = req.body;

//   if (!validateObjectId(videoId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Video ID"));
//   }

//   if (!content?.trim()) {
//     return res.status(400).json(new ApiResponse(400, null, "Comment content is required"));
//   }

//   const newComment = await Comment.create({
//     content: content.trim(),
//     owner: req.user._id,
//     video: videoId,
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, newComment, "Comment added successfully"));
// });

// // 📄 Get all comments for a video (paginated)
// const getVideoComments = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;

//   if (!validateObjectId(videoId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Video ID"));
//   }

//   const comments = await Comment.aggregate([
//     {
//       $match: {
//         video: new mongoose.Types.ObjectId(videoId),
//         isDeleted: false,
//       },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "owner",
//       },
//     },
//     { $unwind: "$owner" },
//     {
//       $project: {
//         _id: 1,
//         content: 1,
//         parentComment: 1,
//         createdAt: 1,
//         likes: 1,
//         "owner._id": 1,
//         "owner.username": 1,
//         "owner.avatar": 1,
//       },
//     },
//     { $sort: { createdAt: -1 } }
//   ]);

//   return res.status(200).json(new ApiResponse(200, comments, "All comments and replies"));
// });


// // ✏️ Update a comment
// const updateComment = asyncHandler(async (req, res) => {
//   const { commentId } = req.params;
//   const { content } = req.body;

//   if (!validateObjectId(commentId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
//   }

//   if (!content || !content.trim()) {
//     return res.status(400).json(new ApiResponse(400, null, "Comment content cannot be empty"));
//   }

//   const comment = await Comment.findById(commentId);
//   if (!comment || comment.isDeleted) {
//     return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
//   }

//   const isOwner = comment.owner.equals(req.user._id);
//   const isAdmin = req.user.role === "admin";

//   if (!isOwner && !isAdmin) {
//     return res.status(403).json(new ApiResponse(403, null, "Not authorized to edit this comment"));
//   }

//   comment.content = content.trim();
//   await comment.save();

//   return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));
// });

// // ❌ Soft delete a comment
// const deleteComment = asyncHandler(async (req, res) => {
//   const { commentId } = req.params;

//   if (!validateObjectId(commentId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
//   }

//   const comment = await Comment.findById(commentId);
//   if (!comment || comment.isDeleted) {
//     return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
//   }

//   const isOwner = comment.owner.equals(req.user._id);
//   const isAdmin = req.user.role === "admin";

//   if (!isOwner && !isAdmin) {
//     return res.status(403).json(new ApiResponse(403, null, "Not authorized to delete this comment"));
//   }

//   comment.isDeleted = true;
//   comment.content = "[deleted]";
//   await comment.save();

//   return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));
// });

// // ❤️ Like or unlike a comment
// const toggleLikeComment = asyncHandler(async (req, res) => {
//   const { commentId } = req.params;

//   if (!validateObjectId(commentId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
//   }

//   const comment = await Comment.findById(commentId);
//   if (!comment || comment.isDeleted) {
//     return res.status(404).json(new ApiResponse(404, null, "Comment not found"));
//   }

//   const userId = req.user._id;
//   const hasLiked = comment.likes.includes(userId);

//   if (hasLiked) {
//     comment.likes.pull(userId);
//   } else {
//     comment.likes.push(userId);
//   }

//   await comment.save();

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         liked: !hasLiked,
//         totalLikes: comment.likes.length,
//       },
//       hasLiked ? "Comment unliked" : "Comment liked"
//     )
//   );
// });

// // 💬 Reply to a comment
// const replyToComment = asyncHandler(async (req, res) => {
//   const { commentId } = req.params;
//   const { content } = req.body;

//   if (!validateObjectId(commentId)) {
//     return res.status(400).json(new ApiResponse(400, null, "Invalid Comment ID"));
//   }

//   if (!content || !content.trim()) {
//     return res.status(400).json(new ApiResponse(400, null, "Reply content is required"));
//   }

//   const parentComment = await Comment.findById(commentId);
//   if (!parentComment || parentComment.isDeleted) {
//     return res.status(404).json(new ApiResponse(404, null, "Parent comment not found"));
//   }

//   const reply = await Comment.create({
//     content: content.trim(),
//     owner: req.user._id,
//     video: parentComment.video,
//     parentComment: parentComment._id,
//   });

//   const populatedReply = await Comment.findById(reply._id).populate("owner", "username avatar");

//   return res.status(201).json(new ApiResponse(201, populatedReply, "Reply added successfully"));
// });

// export {
//   addComment,
//   getVideoComments,
//   updateComment,
//   deleteComment,
//   toggleLikeComment,
//   replyToComment,
// };
