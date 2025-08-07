// import mongoose from "mongoose";

// const videoSchema = new mongoose.Schema({
//   videoId: { type: String, required: true },
//   playlistId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Playlist",
//   },
//   title: { type: String, required: true },
//   videoRef: { type: mongoose.Schema.Types.ObjectId, required: false },
//   url: { type: String, required: true },
//   thumbnail: { type: String, required: false },
//   description: { type: String, required: false },
//   duration: { type: String, required: false },
//   views: { type: Number, default: 0 },
//   likes: { type: Number, default: 0 },
//   comments: { type: Number, default: 0 },
//   shares: { type: Number, default: 0 },
//   playlistViews: { type: Number, default: 0 },
//   playlistLikes: { type: Number, default: 0 },
//   channelId :{type: String, ref: "Channel"},
//   subscribers: { type: Number, default: 0 },
//   isPublished: { type: Boolean, default: true },
//   uploadedAt: { type: Date, default: Date.now },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// const playlistSchema = new mongoose.Schema(
//   {
//     name: String,
//     description: String,
//     videos: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Video",
//       },
//     ],
//   },
//   { timestamps: true }
// );

// export const Playlist = mongoose.model("Playlist", playlistSchema);


import mongoose from "mongoose";

// Video Schema
const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playlist",
  },
  title: { type: String, required: true },
  videoRef: { type: mongoose.Schema.Types.ObjectId },
  url: { type: String, required: true },
  thumbnail: { type: String },
  description: { type: String },
  duration: { type: String },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  playlistViews: { type: Number, default: 0 },
  playlistLikes: { type: Number, default: 0 },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
  subscribers: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  uploadedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Playlist Schema
const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

// Export Models
export const Video = mongoose.model("Video", videoSchema);
export const Playlist = mongoose.model("Playlist", playlistSchema);
