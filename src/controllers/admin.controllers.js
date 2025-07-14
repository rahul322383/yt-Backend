import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const adminLogin = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if  (!password || (!username && !email)) {
      return res.status(400).json({ message: "Email and password are required", success: false });
    }

    const user = await User.findOne({ email }).select("+password +username");
    if (!user && username) {
      // If username is provided, try to find by username
      user = await User.findOne({ username }).select("+password +email");
    }
    // console.log("User found:", user);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password", success: false });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only.", success: false });
    }
    console.log("User is admin:", user.isAdmin);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password", success: false });
    }

    const token = jwt.sign(
      { _id: user._id, isAdmin: user.isAdmin },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME }
    );

    res.json({
      success: true,
      message: "Admin logged in successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const adminDashboard = (req, res) => {
  res.json({
    success: true,
    message: `Welcome Admin ${req.user.username}!`,
    data: {
      // your admin data here
      usersCount: 100,
      videosCount: 200,
    },
  });
};
export const adminLogout = (req, res) => {
  // Invalidate the token by removing it from the client side
  res.json({ success: true, message: "Admin logged out successfully" });
};

export const getAdminStats = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const videosCount = await Video.countDocuments();
    const commentsCount = await Comment.countDocuments();
    // const reportsCount = await Report.countDocuments();

    res.json({
      success: true,
      data: {
        users: usersCount,
        videos: videosCount,
        comments: commentsCount,
        // reports: reportsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
//video, playlist, report, etc. controllers can be added here
export const getAllVideos = async (req, res) => {
  try { 
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -refreshToken").sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};


export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};


export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};



export const updateUser = async (req, res) => {
  try {
    const { username, email, isAdmin } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, isAdmin },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }
    res.json({ success: true, message: "User updated successfully", data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
export const getReportedComments = async (req, res) => {
  try {
    const comments = await Comment.find({ isReported: true })
      .populate("user", "username email")
      .populate("video", "title");
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error("Error fetching reported comments:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
export const resolveReportedComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { isReported: false },
      { new: true }
    );
    if (!comment) {
      return res.status(404).json({ message: "Comment not found", success: false });
    }
    res.json({ success: true, message: "Comment resolved successfully", data: comment });
  } catch (error) {
    console.error("Error resolving reported comment:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }
    res.json({ success: true, message: "User blocked successfully", data: user });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};  

// You can add more admin controllers here (videos, playlists, etc.)
// For example, you can create controllers for managing videos, playlists, reports, etc.
//get all comments
export const getAllComments = async (req, res) => {
  try {
    const comments = await Comment.find().populate("user", "username email").populate("video", "title");
    res.json({ success: true, data: comments });     
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};