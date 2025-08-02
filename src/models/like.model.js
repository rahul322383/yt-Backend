import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: { type: Schema.Types.ObjectId, ref: "Video" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    tweet: { type: Schema.Types.ObjectId, ref: "Tweet" },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // for guest use
    },
    action: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Fix index
likeSchema.index({ likedBy: 1, video: 1 }, { unique: true }); // ✅ CORRECT FIELD


export const Like = mongoose.model("Like", likeSchema);
