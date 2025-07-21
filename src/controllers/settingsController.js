

// import { User } from "../models/user.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// const allowedCategories = [
//   "account",
//   "notifications",
//   "privacy",
//   "appearance",
//   "language",
//   "security",
//   "apps",
//   "billing",
//   "advanced",
//   "blocklist",
// ];

// const publicAccessibleCategories = ["appearance", "language"];

// // GET: /settings/:category
// export const getSettings = asyncHandler(async (req, res) => {
//   const { category } = req.params;

//   if (!allowedCategories.includes(category)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid settings category",
//     });
//   }

//   // Handle public-access settings
//   if (publicAccessibleCategories.includes(category)) {
//     const publicUser = await User.findOne({ isDefault: true })
//       .select(`settings.${category}`)
//       .lean();

//     return res.status(200).json({
//       success: true,
//       message: `Public ${category} settings fetched successfully.`,
//       data: publicUser?.settings?.[category] || {},
//     });
//   }

//   // Require authentication for private categories
//   if (!req.user?._id) {
//     return res.status(401).json({
//       success: false,
//       message: "Authentication required",
//     });
//   }

//   const user = await User.findById(req.user._id)
//     .select(`settings.${category}`)
//     .lean();

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: "User not found",
//     });
//   }

//   return res.status(200).json({
//     success: true,
//     message: `${category} settings fetched successfully.`,
//     data: user.settings?.[category] || {},
//   });
// });

// // PUT: /settings/:category
// export const updateSettings = asyncHandler(async (req, res) => {
//   const { category } = req.params;
//   const updateData = req.body;

//   if (!allowedCategories.includes(category)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid settings category",
//     });
//   }

//   if (!req.user?._id) {
//     return res.status(401).json({
//       success: false,
//       message: "Authentication required",
//     });
//   }

//   if (typeof updateData !== "object" || Array.isArray(updateData)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid payload format",
//     });
//   }

//   const updatedUser = await User.findByIdAndUpdate(
//     req.user._id,
//     { [`settings.${category}`]: updateData },
//     { new: true }
//   );

//   return res.status(200).json({
//     success: true,
//     message: `${category} settings updated successfully.`,
//     data: updatedUser.settings?.[category] || {},
//   });
// });

// // DELETE: /settings/:category
// export const deleteSettings = asyncHandler(async (req, res) => {
//   const { category } = req.params;

//   if (!allowedCategories.includes(category)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid settings category",
//     });
//   }

//   const updatedUser = await User.findByIdAndUpdate(
//     req.user._id,
//     { [`settings.${category}`]: {} },
//     { new: true }
//   );

//   return res.status(200).json({
//     success: true,
//     message: `${category} settings cleared successfully.`,
//     data: updatedUser.settings?.[category] || {},
//   });
// });

// // GET: /settings (all settings)
// export const getAllSettings = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user._id).select("settings").lean();

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: "User not found",
//     });
//   }

//   const structured = {};
//   allowedCategories.forEach((key) => {
//     structured[key] = user.settings?.[key] || {};
//   });

//   return res.status(200).json({
//     success: true,
//     message: "All settings fetched successfully.",
//     data: structured,
//   });
// });

// // PUT: /settings (update all)
// export const updateAllSettings = asyncHandler(async (req, res) => {
//   const updateData = req.body;

//   if (typeof updateData !== "object" || Array.isArray(updateData)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid payload format",
//     });
//   }

//   const updatedUser = await User.findByIdAndUpdate(
//     req.user._id,
//     { settings: updateData },
//     { new: true }
//   );

//   return res.status(200).json({
//     success: true,
//     message: "All settings updated successfully.",
//     data: updatedUser.settings || {},
//   });
// });

// // DELETE: /settings (clear all)
// export const deleteAllSettings = asyncHandler(async (req, res) => {
//   const updatedUser = await User.findByIdAndUpdate(
//     req.user._id,
//     { settings: {} },
//     { new: true }
//   );

//   return res.status(200).json({
//     success: true,
//     message: "All settings deleted successfully.",
//     data: updatedUser.settings || {},
//   });
// });


import {User} from "../models/user.model.js";
import { validationResult } from "express-validator";

// @desc Get user settings
export const getUserSettings =  async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -__v -refreshToken")
      .populate("youtube"); // optional if YouTube is a ref

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: user.username,
      email: user.email,
      settings: user.settings || {},
      youtube: user.youtube || { connected: false },
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Update account (username, email, password, backup email)
export const updateAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password, backupEmail } = req.body;
    const updateFields = {};

    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (password) updateFields.password = password; // Hash this before saving
    if (backupEmail) updateFields["settings.backupEmail"] = backupEmail;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, select: "-password -__v -refreshToken" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Update settings like theme, language, dark mode time etc.
export const updateSettings = async (req, res) => {
  try {
    const {
      theme,
      notifications,
      emailNotifications,
      pushNotifications,
      language,
      timezone,
      dataExport,
      autoPlayVideos,
      videoQuality,
      downloadQuality,
      darkModeSchedule,
      darkModeStart,
      darkModeEnd,
      youtube,
    } = req.body;

    const settingsUpdate = {
      theme,
      notifications,
      emailNotifications,
      pushNotifications,
      language,
      timezone,
      dataExport,
      autoPlayVideos,
      videoQuality,
      downloadQuality,
      darkModeSchedule,
      darkModeStart,
      darkModeEnd,
    };

    const updateFields = {
      settings: settingsUpdate,
    };

    if (youtube) {
      updateFields.youtube = youtube;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, select: "-password -__v -refreshToken" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Delete user account
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // TODO: delete associated data (videos, comments, likes, etc.)
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Export full user data
export const exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -__v -refreshToken")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // TODO: include other data like video history, likes, etc.
    res.json(user);
  } catch (error) {
    console.error("Error exporting user data:", error);
    res.status(500).json({ message: "Server error" });
  }
};
