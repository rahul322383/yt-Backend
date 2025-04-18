import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { v4 as uuidv4 } from "uuid";

const videoSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },
    playlistId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Playlist",
      },
    ],
    title: {
      type: String,
      required: [true, "Video title is required"],
    },
    description: {
      type: String,
    },
    videoUrl: {
      type: String,
      required: [false, "Video URL is required"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    duration: {
      type: Number,
    },
    size: {
      type: Number,
    },
    cloudinaryId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
