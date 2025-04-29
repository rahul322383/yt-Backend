import { mongoose } from "mongoose";
import { User } from "../models/user.model.js"; // Import the User model
import { asyncHandler } from "../utils/asyncHandler.js"; // Custom async error handler
import crypto from "crypto";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Channel  from "../models/channel.model.js";

// ✅ Create a new user channel (if not exists)
export const createChannel = asyncHandler(async (req, res) => {
  const {fullName,username} = req.body;
  
  // Check if the user already has a channel
  let user = await User.findOne({username });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  if (user.channelId) {
    return res.status(400).json({
      success: false,
      message: "User already has a channel"
    });
  }

  // Create a new channelId if not exists (channelId generation is automatic in your model)
  // user.channelId = `channel_${crypto.randomUUID().slice(0, 12)}`;
  user.channelId = new mongoose.Types.ObjectId();

  
  if (fullName) user.fullName = fullName;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Channel created successfully",
    data: user
  });
});

// ✅ Get a user's channel by username

// Controller function to get channel info by username
export const getChannelByName = asyncHandler(async (req, res) => {
  const { username } = req.params;  // Extract the username from the URL parameter

  // Find user by username in the database
  const user = await User.findOne({ username });

  if (!user) {
    // If the user is not found, send a 404 response
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // If the user is found, return the channel data
  res.status(200).json({
    success: true,
    data: {
      channelId: user.channelId,
      avatar: user.avatar,
      coverImage: user.coverImage
    }
  });
});

// ✅ Update channel details
export const updateChannel = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { avatar, coverImage } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  if (avatar) user.avatar = avatar;
  if (coverImage) user.coverImage = coverImage;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Channel updated successfully",
    data: user
  });
});

// ✅ Delete user channel (optional)
export const deleteChannel = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  user.channelId = null; // Remove the channelId
  user.avatar = null;
  user.coverImage = null;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Channel deleted successfully"
  });
});





// export const createChannel = asyncHandler(async (req, res) => {
//   const { username} = req.body;

//   // 1. Validate user existence
//   const user = await User.findOne({ username });

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: "User not found"
//     });
//   }

//   // 2. Check if channel already exists for this user
//   const existingChannel = await Channel.findOne({ user: user._id });

//   if (existingChannel) {
//     return res.status(406).json({
//       success:true,
//       message: "User already has a channel"
//     });
//   }

//   // 3. Create new channel document
//   const newChannel = await Channel.create({
//     user: user._id,
//     ChannelId: `channel_${new mongoose.Types.ObjectId().toHexString().slice(0, 12)}`,
//     name: name || user.username,
//     description: description || "",
//     avatar: user.avatar || "",
//     banner: user.coverImage || ""
//   });

//   // 4. Optional: Update user with ChannelId (not necessary if you use the Channel model only)
//   // user.channelId = newChannel.ChannelId;
//   // await user.save();

//   return res.status(201).json(
//     new ApiResponse(201, newChannel, "Channel created successfully")
//   );
// });
