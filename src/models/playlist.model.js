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
        
        title: { type: String, required: true },
        videoUrl: { type: String, required: false }, // renamed for consistency
        videoRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
        }
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
