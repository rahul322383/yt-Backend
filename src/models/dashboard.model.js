import mongoose from "mongoose";

const dashboardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One dashboard per user
    },
    recentVideos: [
      {
        video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
        // viewedAt: { type: Date, default: Date.now },
        // owner : { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // watchedAt: { type: Date, default: Date.now },
      },
    ],
    recentTweets: [
      {
        tweet: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    stats: {
      totalVideos: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      totalSubscribers: { type: Number, default: 0 },
      totalTweets: { type: Number, default: 0 },
    },
    notifications: [
      {
        message: { type: String },
        type: { type: String, enum: ["info", "like", "comment", "sub", "tweet"] },
        seen: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);


export const Dashboard = mongoose.model("Dashboard", dashboardSchema);
