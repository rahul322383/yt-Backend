import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { exportUsersToCSV } from "../utils/exportCSV.js"; // Make sure you have this util

// GET /admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, isActive, page = 1, limit = 10 } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { fullname: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === "true";

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select("-password -refreshToken")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      users,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    }, "Users fetched successfully")
  );
});

// GET /admin/users/export/csv
 const exportUsersCSV = asyncHandler(async (req, res) => {
  const users = await User.find().select("fullname username email role isActive createdAt");
  const csv = exportUsersToCSV(users); // You need a util function for CSV export

  res.header("Content-Type", "text/csv");
  res.attachment("users.csv");
  return res.send(csv);
});

// GET /admin/users/:userId
 const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

// PUT /admin/users/:userId
const updateUserByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const updateFields = {};
  if (role) updateFields.role = role;
  if (typeof isActive === "boolean") updateFields.isActive = isActive;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found or update failed");
  }

  return res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

// DELETE /admin/users/:userId
const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    throw new ApiError(404, "User not found or already deleted");
  }

  return res.status(200).json(new ApiResponse(200, deletedUser, "User deleted successfully"));
});

// PATCH /admin/users/:userId/toggle-active
const toggleUserActiveStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isActive = !user.isActive;
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { isActive: user.isActive },
      `User has been ${user.isActive ? "activated" : "deactivated"}`
    )
  );
});



export {
  getAllUsers,
  exportUsersCSV,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
  toggleUserActiveStatus
}
