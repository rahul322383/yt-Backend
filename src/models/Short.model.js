import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { User } from "./user.model.js"; // Assuming you have a User model


const shortSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedBy: { type: String, default: "Anonymous" },
  createdAt: { type: Date, default: Date.now },
  tags: { type: [String], default: [] },
  // cloudinaryId: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  views: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  duration: { type: String, required: false },
  size: { type: Number, required: false },
});

export default mongoose.model("Short", shortSchema);
