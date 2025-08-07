import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videos: [
      {
        videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
        channelId: {
          type: String,
          ref: "Channel"
        },
        owner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        title: { type: String, required: true },
        videoUrl: { type: String, required: false }, // renamed for consistency
        videoRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
          
        },
   
        // likes : { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        // comments: { type: Number, default: 0 },
        // shares: { type: Number, default: 0 },
        duration: { type: String, required: false },
        isPublished: { type: Boolean, default: true },
        uploadedAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);