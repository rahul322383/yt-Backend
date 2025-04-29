import { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import  Channel  from "../models/channel.model.js";



const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json(new ApiError(400, "Channel ID is required"));
  }

  // Prevent self-subscription
  if (req.user.channelId === channelId) {
    return res.status(400).json(new ApiError(400, "You cannot subscribe to yourself"));
  }

  // Find the user based on custom channelId
  const channelUser = await User.findOne({ channelId });
  if (!channelUser) {
    return res.status(404).json(new ApiError(404, "Channel not found"));
  }

  const existing = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelUser._id,
  });

  if (existing) {
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  }

  // Create new subscription
  const newSubscription = await Subscription.create({
    subscriber: req.user._id,
    channel: channelUser._id,
  });

  // Populate for richer response
  const populated = await Subscription.findById(newSubscription._id)
    .populate("subscriber", "username channelId avatar")
    .populate("channel", "username channelId avatar");

  return res
    .status(201)
    .json(
      new ApiResponse(201, populated, "Subscribed successfully")
    );
});





// ✅ Get all subscribers for a specific channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate channelId is a valid ObjectId
  if (!isValidObjectId(channelId)) {
    return res.status(400).json(new ApiError(400, "Invalid channel ID"));
  }

  // Fetch all subscriptions for the channel
  const subscribers = await Subscription.find({ channel: channelId })
    .populate("subscriber", "username avatar") // Only include username and avatar
    .lean();

  // Return response with subscribers count and subscriber details
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total: subscribers.length,
        subscribers,
      },
      "Subscribers fetched successfully"
    )
  );
});

// ✅ Get all channels a user is subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  // Validate subscriberId is a valid ObjectId
  if (!isValidObjectId(subscriberId)) {
    return res.status(400).json(new ApiError(400, "Invalid subscriber ID"));
  }

  // Fetch all subscriptions for the user (subscriber)
  const subscriptions = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "username avatar") // Only include username and avatar
    .lean();

  // Return response with subscribed channels count and details
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total: subscriptions.length,
        channels: subscriptions.map((s) => s.channel), // Extract only channel details
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};



