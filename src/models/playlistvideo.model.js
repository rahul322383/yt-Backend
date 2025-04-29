import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playlist",
  },
  title: { type: String, required: true },
  videoRef: { type: mongoose.Schema.Types.ObjectId, required: false },
  url: { type: String, required: true },
  thumbnail: { type: String, required: false },
  description: { type: String, required: false },
  duration: { type: String, required: false },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  subscribers: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  uploadedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const playlistSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
