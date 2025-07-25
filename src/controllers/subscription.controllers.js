import { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";




const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { sessionId } = req.body;

  // ✅ Validate channelId
  if (!channelId || typeof channelId !== "string") {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Valid Channel ID is required"));
  }

  // ✅ Prevent subscribing to self if logged in
  if (req.user?.channelId === channelId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "You cannot subscribe to your own channel"));
  }

  // ✅ Get channel user by public channelId
  const channelUser = await User.findOne({ channelId });
  if (!channelUser) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Channel not found"));
  }

  // ✅ Guest or logged-in user filter
  const filter = req.user?._id
    ? { subscriber: req.user._id, channel: channelUser._id }
    : { sessionId, channel: channelUser._id };

  if (!filter.subscriber && !filter.sessionId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Login or session ID required"));
  }

  const existingSub = await Subscription.findOne(filter);

  // ✅ Unsubscribe if already exists
  if (existingSub) {
    await existingSub.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  }

  // ✅ Subscribe
  try {
    const subscription = await Subscription.create({
      channel: channelUser._id,
      ...(req.user?._id && { subscriber: req.user._id }),
      ...(sessionId && { sessionId }),
    });

    const populated = await Subscription.findById(subscription._id)
      .populate("subscriber", "username channelId avatar")
      .populate("channel", "username channelId avatar");

    return res
      .status(201)
      .json(new ApiResponse(201, populated, "Subscribed successfully"));
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json(new ApiResponse(409, null, "Already subscribed"));
    }
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to subscribe"));
  }
});








const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json(
      new ApiResponse(400, null, "Channel ID is required")
    );
  }

  // Get the user behind the channel ID
  const channelUser = await User.findOne({ channelId }).select("_id");

  if (!channelUser) {
    return res.status(404).json(
      new ApiResponse(404, null, "Channel not found")
    );
  }

  // Find all subscriptions where this channel is the target
  const subscribers = await Subscription.find({ channel: channelUser._id })
    .populate("subscriber", "username avatar channelId")
    .lean();

  return res.status(200).json(
    new ApiResponse(200, {
      total: subscribers.length,
      subscribers,
    }, "Subscribers fetched successfully")
  );
});



// GET /api/v1/users/subscribe/subscribed/:channelId
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      data: null,
      message: "Channel ID is required",
    });
  }

  // Find the user by their channel ID
  const user = await User.findOne({ channelId }).select("_id");

  if (!user) {
    return res.status(404).json({
      statusCode: 404,
      success: false,
      data: null,
      message: "User not found",
    });
  }

  // Get all subscriptions made by this user
  const subscriptions = await Subscription.find({ subscriber: user._id })
    .populate("channel", "username avatar channelId")
    .lean();

  return res.status(200).json({
    statusCode: 200,
    success: true,
    data: {
      total: subscriptions.length,
      channels: subscriptions.map((sub) => sub.channel),
    },
    message: "Subscribed channels fetched successfully",
  });
});

const toggleNotification = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json(new ApiResponse(400, null, "Channel ID is required"));
  }

  const channelUser = await User.findOne({ channelId }).select("_id");
  if (!channelUser) {
    return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
  }

  const subscriberId = req.user?._id;
  if (!subscriberId) {
    return res.status(401).json(new ApiResponse(401, null, "Login required"));
  }

  const subscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelUser._id,
  });

  if (!subscription) {
    return res.status(404).json(new ApiResponse(404, null, "Subscription not found"));
  }

  subscription.notifications = !subscription.notifications;
  await subscription.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { notify: subscription.notifications },
      subscription.notifications
        ? "🔔 Notifications turned ON"
        : "🔕 Notifications turned OFF"
    )
  );
});




export {
  toggleNotification,
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};



