// // import { Subscription } from "../models/subscription.model.js";
// // import { ApiResponse } from "../utils/ApiResponse.js";
// // import { asyncHandler } from "../utils/asyncHandler.js";
// // import { User } from "../models/user.model.js";

// // // ✅ Toggle subscribe/unsubscribe
// // const toggleSubscription = asyncHandler(async (req, res) => {
// //   const { channelId } = req.params;

// //   if (!req.user?._id) {
// //     return res.status(401).json(new ApiResponse(401, null, "Login required"));
// //   }

// //   if (!channelId || typeof channelId !== "string") {
// //     return res.status(400).json(new ApiResponse(400, null, "Valid Channel ID is required"));
// //   }

// //   if (req.user.channelId === channelId) {
// //     return res.status(400).json(new ApiResponse(400, null, "You cannot subscribe to your own channel"));
// //   }

// //   const channelUser = await User.findOne({ channelId }).select("_id");

// //   if (!channelUser) {
// //     return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
// //   }

// //   const filter = { subscriber: req.user._id, channel: channelUser._id };

// //   const existingSubscription = await Subscription.findOne(filter);

// //   if (existingSubscription) {
// //     await existingSubscription.deleteOne();
// //     return res.status(200).json(new ApiResponse(200, null, "Unsubscribed successfully"));
// //   }

// //   try {
// //     const subscription = await Subscription.create(filter);

// //     const populated = await Subscription.findById(subscription._id)
// //       .populate("subscriber", "username channelId avatar")
// //       .populate("channel", "username channelId avatar");

// //     return res.status(201).json(new ApiResponse(201, populated, "Subscribed successfully"));
// //   } catch (error) {
// //     if (error.code === 11000) {
// //       return res.status(409).json(new ApiResponse(409, null, "Already subscribed"));
// //     }
// //     return res.status(500).json(new ApiResponse(500, null, "Failed to subscribe"));
// //   }
// // });


// // // ✅ Get all subscribers of a given channel
// // const getUserChannelSubscribers = asyncHandler(async (req, res) => {
// //   const { channelId } = req.params;

// //   if (!channelId) {
// //     return res.status(400).json(new ApiResponse(400, null, "Channel ID is required"));
// //   }

// //   const channelUser = await User.findOne({ channelId }).select("_id");

// //   if (!channelUser) {
// //     return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
// //   }

// //   const subscribers = await Subscription.find({ channel: channelUser._id })
// //     .populate("subscriber", "username avatar channelId")
// //     .lean();

// //   return res.status(200).json(
// //     new ApiResponse(200, {
// //       total: subscribers.length,
// //       subscribers,
// //     }, "Subscribers fetched successfully")
// //   );
// // });


// // // ✅ Get all channels the user has subscribed to
// // const getSubscribedChannels = asyncHandler(async (req, res) => {
// //   const { channelId } = req.params;

// //   if (!channelId) {
// //     return res.status(400).json(new ApiResponse(400, null, "Channel ID is required"));
// //   }

// //   const user = await User.findOne({ channelId }).select("_id");

// //   if (!user) {
// //     return res.status(404).json(new ApiResponse(404, null, "User not found"));
// //   }

// //   const subscriptions = await Subscription.find({ subscriber: user._id })
// //     .populate("channel", "username avatar channelId")
// //     .lean();

// //   const channels = subscriptions.map((sub) => sub.channel);

// //   return res.status(200).json(
// //     new ApiResponse(200, {
// //       total: channels.length,
// //       channels,
// //     }, "Subscribed channels fetched successfully")
// //   );
// // });


// // // ✅ Toggle bell notifications on a subscription
// // const toggleNotification = asyncHandler(async (req, res) => {
// //   const { channelId } = req.params;

// //   if (!req.user?._id) {
// //     return res.status(401).json(new ApiResponse(401, null, "Login required"));
// //   }

// //   if (!channelId) {
// //     return res.status(400).json(new ApiResponse(400, null, "Channel ID is required"));
// //   }

// //   const channelUser = await User.findOne({ channelId }).select("_id");

// //   if (!channelUser) {
// //     return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
// //   }

// //   const subscription = await Subscription.findOne({
// //     subscriber: req.user._id,
// //     channel: channelUser._id,
// //   });

// //   if (!subscription) {
// //     return res.status(404).json(new ApiResponse(404, null, "Subscription not found"));
// //   }

// //   subscription.notifications = !subscription.notifications;
// //   await subscription.save();

// //   return res.status(200).json(
// //     new ApiResponse(
// //       200,
// //       { notify: subscription.notifications },
// //       subscription.notifications
// //         ? "🔔 Notifications turned ON"
// //         : "🔕 Notifications turned OFF"
// //     )
// //   );
// // });

// // // GET /subscriptions/status/:channelId
// // const getSubscriptionStatus = asyncHandler(async (req, res) => {
// //   const { channelId } = req.params;

// //   if (!channelId) {
// //     return res
// //       .status(400)
// //       .json(new ApiResponse(400, null, "Channel ID is required"));
// //   }

// //   const subscribed = await Subscription.exists({
// //     subscriber: req.user._id,
// //     channel: channelId,
// //   });

// //   return res.status(200).json(
// //     new ApiResponse(
// //       200,
// //       { subscribed: !!subscribed },
// //       "Subscription status fetched successfully"
// //     )
// //   );
// // });


// // export {
// //   toggleNotification,
// //   toggleSubscription,
// //   getUserChannelSubscribers,
// //   getSubscribedChannels,
// //   getSubscriptionStatus
// // };

// import { Subscription } from "../models/subscription.model.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { User } from "../models/user.model.js";


// // ✅ Helper: Get channel user by channelId
// const getChannelUserById = async (channelId) => {
//   if (!channelId || typeof channelId !== "string") return null;
//   return await User.findOne({ channelId }).select("_id username avatar channelId");
// };

// // ✅ Toggle subscribe/unsubscribe
// const toggleSubscription = asyncHandler(async (req, res) => {
//   if (!req.user?._id) return res.status(401).json(new ApiResponse(401, null, "Login required"));

//   const { channelId } = req.params;
//   const channelUser = await getChannelUserById(channelId);
//   if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
//   if (req.user.channelId === channelId) return res.status(400).json(new ApiResponse(400, null, "You cannot subscribe to your own channel"));

//   const filter = { subscriber: req.user._id, channel: channelUser._id };
//   const existing = await Subscription.findOne(filter);

//   if (existing) {
//     await existing.deleteOne();
//     return res.status(200).json(new ApiResponse(200, null, "Unsubscribed successfully"));
//   }

//   try {
//     const subscription = await Subscription.create(filter);
//     const populated = await Subscription.findById(subscription._id)
//       .populate("subscriber", "username channelId avatar")
//       .populate("channel", "username channelId avatar");

//     return res.status(201).json(new ApiResponse(201, populated, "Subscribed successfully"));
//   } catch (error) {
//     if (error.code === 11000) return res.status(409).json(new ApiResponse(409, null, "Already subscribed"));
//     return res.status(500).json(new ApiResponse(500, null, "Failed to subscribe"));
//   }
// });

// // ✅ Get all subscribers of a given channel
// const getUserChannelSubscribers = asyncHandler(async (req, res) => {
//   const { channelId } = req.params;
//   const channelUser = await getChannelUserById(channelId);
//   if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));

//   const subscribers = await Subscription.find({ channel: channelUser._id })
//     .populate("subscriber", "username avatar channelId")
//     .lean();

//   return res.status(200).json(
//     new ApiResponse(200, { total: subscribers.length, subscribers }, "Subscribers fetched successfully")
//   );
// });

// // ✅ Get all channels the user has subscribed to
// const getSubscribedChannels = asyncHandler(async (req, res) => {
//   const { channelId } = req.params;
//   const user = await getChannelUserById(channelId);
//   if (!user) return res.status(404).json(new ApiResponse(404, null, "User not found"));

//   const subscriptions = await Subscription.find({ subscriber: user._id })
//     .populate("channel", "username avatar channelId")
//     .lean();

//   const channels = subscriptions.map((sub) => sub.channel);

//   return res.status(200).json(
//     new ApiResponse(200, { total: channels.length, channels }, "Subscribed channels fetched successfully")
//   );
// });

// // ✅ Toggle bell notifications
// const toggleNotification = asyncHandler(async (req, res) => {
//   if (!req.user?._id) return res.status(401).json(new ApiResponse(401, null, "Login required"));

//   const { channelId } = req.params;
//   const channelUser = await getChannelUserById(channelId);
//   if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));

//   const subscription = await Subscription.findOne({ subscriber: req.user._id, channel: channelUser._id });
//   if (!subscription) return res.status(404).json(new ApiResponse(404, null, "Subscription not found"));

//   subscription.notifications = !subscription.notifications;
//   await subscription.save();

//   return res.status(200).json(
//     new ApiResponse(200, { notify: subscription.notifications }, subscription.notifications ? "🔔 Notifications ON" : "🔕 Notifications OFF")
//   );
// });

// // ✅ Get subscription status
// const getSubscriptionStatus = asyncHandler(async (req, res) => {
//   const { channelId } = req.params;
//   const channelUser = await getChannelUserById(channelId);
//   if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));

//   const subscribed = await Subscription.exists({ subscriber: req.user._id, channel: channelUser._id });
//   return res.status(200).json(new ApiResponse(200, { subscribed: !!subscribed }, "Subscription status fetched successfully"));
// });

// export {
//   toggleSubscription,
//   getUserChannelSubscribers,
//   getSubscribedChannels,
//   toggleNotification,
//   getSubscriptionStatus
// };


import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

// ✅ Helper: Get channel user by channelId
const getChannelUserById = async (channelId) => {
  if (!channelId || typeof channelId !== "string") return null;
  return await User.findOne({ channelId }).select("_id username avatar channelId");
};

// ✅ Toggle subscribe/unsubscribe
const toggleSubscription = asyncHandler(async (req, res) => {
  if (!req.user?._id) return res.status(401).json(new ApiResponse(401, null, "Login required"));

  const { channelId } = req.params;
  const channelUser = await getChannelUserById(channelId);
  if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));
  if (req.user.channelId === channelId) return res.status(400).json(new ApiResponse(400, null, "You cannot subscribe to your own channel"));

  const filter = { subscriber: req.user._id, channel: channelUser._id };
  const existing = await Subscription.findOne(filter);

  if (existing) {
    await existing.deleteOne();
    return res.status(200).json(new ApiResponse(200, null, "Unsubscribed successfully"));
  }

  try {
    const subscription = await Subscription.create(filter);
    const populated = await Subscription.findById(subscription._id)
      .populate("subscriber", "username channelId avatar")
      .populate("channel", "username channelId avatar");

    return res.status(201).json(new ApiResponse(201, populated, "Subscribed successfully"));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json(new ApiResponse(409, null, "Already subscribed"));
    return res.status(500).json(new ApiResponse(500, null, "Failed to subscribe"));
  }
});

// ✅ Get combined subscription status + notifications for a channel
const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const channelUser = await getChannelUserById(channelId);
  if (!req.user?._id) return res.status(401).json(new ApiResponse(401, null, "Login required"));

  if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));

  // Check if subscribed
  const subscription = await Subscription.exists({ subscriber: req.user._id, channel: channelUser._id });

  return res.status(200).json(
    new ApiResponse(200, {
      subscribed: !!subscription,
      notifications: subscription?.notifications || false
    }, "Subscription status fetched successfully")
  );
});

// ✅ Toggle bell notifications
const toggleNotification = asyncHandler(async (req, res) => {
  if (!req.user?._id) return res.status(401).json(new ApiResponse(401, null, "Login required"));

  const { channelId } = req.params;
  const channelUser = await getChannelUserById(channelId);
  if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));

  const subscription = await Subscription.findOne({ subscriber: req.user._id, channel: channelUser._id });
  if (!subscription) return res.status(404).json(new ApiResponse(404, null, "Subscription not found"));

  subscription.notifications = !subscription.notifications;
  await subscription.save();

  return res.status(200).json(
    new ApiResponse(200, { notifications: subscription.notifications }, subscription.notifications ? "🔔 Notifications ON" : "🔕 Notifications OFF")
  );
});

// ✅ Get subscribers of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channelUser = await getChannelUserById(channelId);

  if (!channelUser) return res.status(404).json(new ApiResponse(404, null, "Channel not found"));

  const subscribers = await Subscription.find({ channel: channelUser._id })
    .populate("subscriber", "username avatar channelId")
    
    .lean();
    

  return res.status(200).json(
    new ApiResponse(200, { total: subscribers.length, subscribers }, "Subscribers fetched successfully")
  );
});


// const getSubscribedChannels = asyncHandler(async (req, res) => {
//   const { channelId } = req.params;
//   const user = await getChannelUserById(channelId);
//   if (!user) return res.status(404).json(new ApiResponse(404, null, "User not found"));

//   const subscriptions = await Subscription.find({ subscriber: user._id })
//     .populate("channel", "username avatar channelId")
//     .lean();

//   const channels = subscriptions.map((sub) => sub.channel);

//   return res.status(200).json(
//     new ApiResponse(200, { total: channels.length, channels }, "Subscribed channels fetched successfully")
//   );
// });


// ✅ Get all channels a user is subscribed to + channel videos + live sub count
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // 🔹 Get the user who owns this channel
  const user = await User.findOne({ channelId });

  
  if (!user)
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found"));

  // 🔹 Find all subscriptions made by this user
  const subscriptions = await Subscription.find({ subscriber: user._id })
    .populate("channel", "username avatar _id")
    .lean();

  // 🔹 For each channel, get videos + subscriber count
  const channels = await Promise.all(
    subscriptions.map(async (sub) => {
      const channel = sub.channel;

      // total subs for this channel
      const subscriberCount = await Subscription.countDocuments({
        channel: channel._id,
      });

      // recent videos from this channel (limit 5 for performance)
      const videos = await Video.find({ owner: channel._id })
        .select("title videoUrl views likes createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      return {
        ...channel,
        subscriberCount,
        videos,
      };
    })
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total: channels.length,
        channels,
      },
      "Subscribed channels with videos & sub count fetched successfully"
    )
  );
});





export {
  toggleSubscription,
  getSubscriptionStatus,
  toggleNotification,
  getSubscribedChannels,
  getUserChannelSubscribers
};
