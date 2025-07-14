import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },

    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    dislikes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
isHidden: { type: Boolean, default: false },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
   
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Optional: Add indexing for performance (pagination/sorting)
commentSchema.index({ video: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
