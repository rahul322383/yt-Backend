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
        videoId: { type: String, required: true },
        channelId: {
          type: String,
          ref: "Channel"
        },
        
        title: { type: String, required: true },
        videoUrl: { type: String, required: false }, // renamed for consistency
        videoRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
        },
        url: { type: String, required: false },
        thumbnail: { type: String, required: false },
        description: { type: String, required: false },
        duration: { type: String, required: false },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        playlistViews: { type: Number, default: 0 },
        playlistLikes: { type: Number, default: 0 },
        subscribers: { type: Number, default: 0 },
        isPublished: { type: Boolean, default: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
