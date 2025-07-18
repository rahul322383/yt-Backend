import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const allowedCategories = [
  "account",
  "notifications",
  "privacy",
  "appearance",
  "language",
  "security",
  "apps",
  "billing",
  "advanced",
  "blocklist",
];

const publicAccessibleCategories = ["appearance", "language"];

// GET: Single Category
export const getSettings = asyncHandler(async (req, res) => {
  const category = req.params.category;

  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings category",
    });
  }

  if (publicAccessibleCategories.includes(category)) {
    const publicUser = await User.findOne({ isDefault: true }).select(`settings.${category}`).lean();
    return res.status(200).json({
      success: true,
      message: `${category} settings (public) fetched successfully.`,
      data: publicUser?.settings?.[category] || {},
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required for this category",
    });
  }

  const user = await User.findById(req.user._id).select(`settings.${category}`).lean();
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    message: `${category} settings fetched successfully.`,
    data: user.settings?.[category] || {},
  });
});

// PUT: Update Single Category
export const updateSettings = asyncHandler(async (req, res) => {
  const category = req.params.category;
  const userId = req.user._id;

  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings category",
    });
  }

  const updatePayload = req.body;

  if (typeof updatePayload !== "object" || Array.isArray(updatePayload)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payload format",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { [`settings.${category}`]: updatePayload },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: `${category} settings updated successfully.`,
    data: updatedUser.settings?.[category] || {},
  });
});

// DELETE: Clear Single Category
export const deleteSettings = asyncHandler(async (req, res) => {
  const category = req.params.category;
  const userId = req.user._id;

  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings category",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { [`settings.${category}`]: {} },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: `${category} settings cleared successfully.`,
    data: updatedUser.settings?.[category] || {},
  });
});

// GET: All Settings
export const getAllSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("settings").lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const structured = {};
  allowedCategories.forEach((key) => {
    structured[key] = user.settings?.[key] || {};
  });

  res.status(200).json({
    success: true,
    message: "All settings fetched successfully",
    data: structured,
  });
});

// PUT: Update All Settings
export const updateAllSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updatePayload = req.body;

  if (typeof updatePayload !== "object" || Array.isArray(updatePayload)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payload format",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { settings: updatePayload },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "All settings updated successfully",
    data: updatedUser.settings || {},
  });
});

// DELETE: All Settings
export const deleteAllSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { settings: {} },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "All settings deleted successfully",
    data: updatedUser.settings || {},
  });
});
