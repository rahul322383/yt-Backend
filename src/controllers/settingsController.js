import { connect } from 'mongoose';
import { User } from '../models/user.model.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const allowedCategories = [
  'account',
  'advancedSettings',
  'billing',
  'connectedApps',
  'downloads',
  'notification',
  'placeholder',
  'playback',
  'privacy'
];

export const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const category = req.params.category;

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings category',
      });
    }

    const updatePayload = req.body;

    if (typeof updatePayload !== 'object' || Array.isArray(updatePayload)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload format',
      });
    }

    const update = {
      [`settings.${category}`]: updatePayload,
    };

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
    });

    let toastMessage = `${category} settings updated successfully.`;
    if (category === 'notification' && updatePayload.sms !== undefined) {
      toastMessage += updatePayload.sms
        ? ' SMS alerts enabled.'
        : ' SMS alerts disabled.';
    }

    res.status(200).json({
      success: true,
      message: toastMessage,
      data: updatedUser.settings?.[category] || {},
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating settings',
    });
  }
};

export const getSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const settings = user.settings || {};

  return res.status(200).json({
    success: true,
    message: 'Settings retrieved successfully',
    data: {
      playback: settings.playback || {},
      notifications: settings.notifications || {},
      downloads: settings.downloads || {},
      privacy: settings.privacy || {},
      billing: settings.billing || {},
      advancedSettings: settings.advancedSettings || {},
      placeholder: settings.placeholder || {},
      connectedApps: settings.connectedApps || {},
      account: settings.account || {},
      // Add the rest of your setting sections safely
    },
  });
});

export const deleteSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const category = req.params.category;

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings category',
      });
    }

    const update = {
      [`settings.${category}`]: null,
    };

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
    });

    res.status(200).json({
      success: true,
      message: `${category} settings deleted successfully.`,
      data: updatedUser.settings[category],
    });
  } catch (error) {
    console.error('Settings deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting settings',
    });
  }
};
export const getAllSettings = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('settings');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.settings,
    });
  } catch (error) {
    console.error('Settings retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving settings',
    });
  }
};