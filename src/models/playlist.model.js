import mongoose from 'mongoose';

// const videoSchema = new mongoose.Schema({
//   videoId: {
//     type: String,  // Assuming videoId is a simple string
//     required: true
//   },
//   videoRef: {
//     type: mongoose.Schema.Types.ObjectId,  // Ref to the video document (ObjectId)
//     ref: 'Video',
//     required:false  // Not required for the playlist schema
//   },
//   title: {
//     type: String,
//     required: false  // Not required for the playlist schema
//   }
// });

// const playlistSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   owner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   videos: [videoSchema]  // Array to store videos in the playlist
// });

// const Playlist = mongoose.model('Playlist', playlistSchema);

// export { Playlist };
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
        title: { type: String, required: true },
        videoUrl: { type: String, required: false }, // renamed for consistency
        videoRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
