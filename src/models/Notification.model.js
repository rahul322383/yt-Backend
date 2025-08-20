// import mongoose from "mongoose";

// const notificationSchema = new mongoose.Schema(
//   {
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     type: { type: String, enum: ["like", "comment", "subscription", "other"], required: true },
//     message: { type: String, required: true },
//     isRead: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

//  export default mongoose.model("Notification", notificationSchema);
// models/Notification.model.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["like", "new_video", "comment", "custom"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId }, // videoId, commentId, etc.
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
