import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import zxcvbn from 'zxcvbn';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'QRCode';
import { Video } from '../models/video.model.js';
import {v2 as cloudinary} from 'cloudinary';
import {Like } from '../models/like.model.js';
import { Comment } from '../models/comment.model.js';
import { google } from 'googleapis';
import { Playlist } from '../models/playlist.model.js';


// Token generator
const generateAccessTokenAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) 
  return res.status(404).json(
    new ApiResponse(404, null, "User not found")
  );

  if (typeof user.generateAccessToken !== "function" || typeof user.generateRefreshToken !== "function") {
    return res.status(500).json({
      success: false,
      message: "Token generation methods are missing in User model",
    });
  }
  

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  try {
    const {
      fullName,
      email,
      username,
      password,
      signupType = "email", // "email" | "google" | "github" | "facebook"
      providerId,
      avatarUrl,
      coverUrl,
      ...rest
    } = req.body;

    // 🧽 Clean input
    const cleanFullName = fullName?.trim();
    const cleanEmail = email?.toLowerCase().trim();
    const cleanUsername = username?.trim().toLowerCase();

    // 🧠 Regex validators
    const emojiOrSymbolRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{S}]/gu;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

    // 🧾 Field validations
    if (signupType === "email") {
      if (![cleanFullName, cleanEmail, cleanUsername, password].every(Boolean)) {
        return res.status(400).json(new ApiResponse(400, null, "Missing required fields"));
      }

      if (emojiOrSymbolRegex.test(cleanFullName)) {
        return res.status(400).json(new ApiResponse(400, null, "Full name can't contain emojis or symbols"));
      }

      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json(new ApiResponse(400, null, "Username must be 3-20 chars (letters, numbers, underscores only)"));
      }

      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid email format"));
      }

      if (!passwordRegex.test(password)) {
        return res.status(400).json(new ApiResponse(400, null, "Password must be 6+ chars with uppercase, lowercase & number"));
      }
    } else {
      if (!cleanEmail || !providerId || !signupType) {
        return res.status(400).json(new ApiResponse(400, null, "Missing required OAuth fields"));
      }
    }

    // 🔍 Check if email or username already exists
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json(new ApiResponse(409, null, "Email is already registered"));
    }

    if (signupType === "email") {
      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        return res.status(409).json(new ApiResponse(409, null, "Username is already taken"));
      }
    }

    if (signupType !== "email") {
      const existingOAuth = await User.findOne({ providerId, signupType });
      if (existingOAuth) {
        return res.status(409).json(new ApiResponse(409, null, `${signupType} account already exists`));
      }
    }

    // 🖼️ Upload files
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.cover?.[0]?.path;

    const avatarUpload = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : null;
    const coverUpload = coverLocalPath ? await uploadOnCloudinary(coverLocalPath) : null;

    if (signupType === "email" && !avatarUpload?.url) {
      return res.status(400).json(new ApiResponse(400, null, "Avatar is required for email signup"));
    }

    // 👤 Create user
    const newUser = await User.create({
      fullName: cleanFullName,
      email: cleanEmail,
      username: cleanUsername,
      password: signupType === "email" ? password : undefined,
      providerId: signupType !== "email" ? providerId : undefined,
      signupType,
      avatar: avatarUpload?.url || avatarUrl || "",
      coverImage: coverUpload?.url || coverUrl || "",
      ...rest,
    });

    if (!newUser) {
      return res.status(500).json(new ApiResponse(500, null, "User creation failed"));
    }

    // 🔐 Tokens
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(newUser._id);
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // 🍪 Set tokens in cookies
    const isProd = process.env.NODE_ENV === "production";
    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

    // 📦 Send response
    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

    return res.status(201).json(
      new ApiResponse(201, {
        user: createdUser,
        accessToken,
        refreshToken,
      }, "User created successfully")
    );
  } catch (error) {
    console.error("Register Error:", error);

    // MongoDB duplicate key fallback
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      return res.status(409).json(new ApiResponse(409, null, `${duplicateField} is already in use`));
    }

    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message || "Internal Server Error")
    );
  }
});

const socialLogin = async (req, res) => {
  const { token, provider } = req.body;

  if (!token || !provider) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Token and provider are required"));
  }

  try {
    let userData = null;

    // ✅ Handle each provider
    if (provider === "google") {
      const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { email, name, picture } = response.data;
      userData = {
        email,
        fullName: name,
        avatar: picture || "",
        loginType: "google",
      };

    } else if (provider === "github") {
      const userResp = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const emailResp = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const email = emailResp.data.find(e => e.primary && e.verified)?.email;
      if (!email) throw new Error("Verified GitHub email not found");

      userData = {
        email,
        fullName: userResp.data.name || userResp.data.login,
        avatar: userResp.data.avatar_url || "",
        loginType: "github",
      };

    } else if (provider === "facebook") {
      const fbResp = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${token}`
      );
      const { email, name, picture } = fbResp.data;
      if (!email) throw new Error("Facebook email not provided");

      userData = {
        email,
        fullName: name,
        avatar: picture?.data?.url || "",
        loginType: "facebook",
      };
    } else {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Unsupported provider"));
    }

    // ⛔ No email = can't proceed
    if (!userData?.email) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Email is required from provider"));
    }

    // 🔍 Check if user exists
    let user = await User.findOne({ email: userData.email });

    // ➕ If not, create new user
    if (!user) {
      user = await User.create({
        fullName: userData.fullName,
        username: userData.email.split("@")[0],
        email: userData.email,
        avatar: userData.avatar,
        password: "", // password is empty for social login
        loginType: userData.loginType,
      });
    }

    // 🔐 Tokens
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    // 🍪 Set cookies (secure in prod)
    const isProd = process.env.NODE_ENV === "production";

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

    // 🚀 Send back sanitized user info
    const safeUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(200).json(
      new ApiResponse(200, {
        user: safeUser,
        accessToken,
      }, `Logged in successfully via ${provider}`)
    );

  } catch (error) {
    console.error("🔥 Social Login Error:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, error.message || "Social login failed"));
  }
};






// LOGOUT
 const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // Extract the refresh token
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (!incomingRefreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token is required" });
  }

  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find user associated with the refresh token
    const user = await User.findById(decodedToken?._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found || Invalid token" });
    }
    
    // Check if the refresh token matches the one stored for the user
    if (!user.refreshToken || incomingRefreshToken !== user.refreshToken) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    // Generate new access and refresh tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);
    
    // Update the user's refresh token with the new one
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    // Set cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensure cookies are sent over HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // For cross-origin requests in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    };

    // Send the new tokens as cookies in the response
    return res
      .status(200)
      .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 }) // 1 day for access token
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Token refreshed successfully"));
    
  } catch (error) {
    console.error("Refresh error:", error);
    throw new ApiError(401, error?.message || "Invalid token || Unauthorized");
  }
});



const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not found in request" });
  }

  return res.status(200).json(
    new ApiResponse(200, req.user, "User fetched successfully")
    
  );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const updates = {};

  // Only add fields that are present in the request body
  if (req.body.fullName) updates.fullName = req.body.fullName;
  if (req.body.email) updates.email = req.body.email.toLowerCase();
  if (req.body.username) updates.username = req.body.username;
  if (req.body.bio) updates.bio = req.body.bio;
  if (req.body.location) updates.location = req.body.location;
  if (req.body.website) updates.website = req.body.website;
  if (req.body.avatar) updates.avatar = req.body.avatar;
  if (req.body.coverImage) updates.coverImage = req.body.coverImage;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields provided for update");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, user, "User details updated successfully")
  );
});



const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Check if email is provided
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Rate limit: Allow OTP request only once per 60 seconds
    if (user.otpRequestedAt && Date.now() - user.otpRequestedAt < 60 * 1000) {
      const waitTime = Math.ceil((60 * 1000 - (Date.now() - user.otpRequestedAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitTime} seconds before requesting a new OTP.`,
      });
    }

    // 4. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Hash the OTP
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = Date.now() + 10 * 60 * 1000; // 10 mins

    // 6. Save to user
    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpires = expiry;
    user.otpRequestedAt = Date.now();
    user.isOtpVerified = false;
    await user.save({ validateBeforeSave: false });

    // 7. Send email (disabled for testing)
    /*
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const message = `Your password reset OTP is: ${otp}\nThis OTP will expire in 10 minutes.`;

    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: user.email,
      subject: 'Password Reset OTP',
      text: message,
    });
    */

    // For dev: log OTP
    console.log(`🧪 Dev OTP for ${user.email}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email',
    });

  } catch (error) {
    console.error('Forget Password Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// VERIFY OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otp || otp.length !== 6 || !email) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedOtp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "OTP is invalid or has expired" });
    }

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.isOtpVerified = true;
    user.otpRequestedAt = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    return res.status(400).json({ success: false, message: "Avatar file is missing" });
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "The user with the provided details could not be found. Please check the information and try again.");
  }

  // 🔥 Step 1: Delete old avatar from Cloudinary (if exists)
  if (user.avatar) {
    try {
      const segments = user.avatar.split("/");
      const fileName = segments[segments.length - 1];
      const publicId = `avatars/${fileName.split(".")[0]}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Error while deleting old avatar" });
    }
  }

  // 🚀 Step 2: Upload new image to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    return res.status(400).json({ success: false, message: "Error while uploading avatar" });
  }

  // ✅ Step 3: Save new avatar URL in DB
  user.avatar = avatar.url;
  await user.save();

  // 🧼 Step 4: Cleanup temp local file (safely)
  // try {
  //   await fs.access(avatarLocalPath); // Check if file exists
  //   await fs.unlinkAsync(avatarLocalPath); // Delete it
  // } catch (err) {
  //   if (err.code !== "ENOENT") {
  //     return res.status(400).json({ success: false, message: "Error while deleting local file" });
  //   }
  // }
  

 return res.status(200).json(
  new ApiResponse(200, { avatar: user.avatar }, "Avatar updated successfully")
);

});


const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Cover image file is required"));
    }

    const uploaded = await uploadOnCloudinary(coverImageLocalPath);
    const imageUrl = uploaded?.secure_url || uploaded?.url;

    if (!imageUrl) {
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to upload cover image"));
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: { coverImage: imageUrl } },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "User not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover image updated successfully"));
  } catch (error) {
    console.error("Cover image upload error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

// delete avatr
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "The user with the provided details could not be found. Please check the information and try again.");
  }

  // 🔥 Step 1: Delete old avatar from Cloudinary (if exists)
  if (user.avatar) {
    try {
      const segments = user.avatar.split("/");
      const fileName = segments[segments.length - 1];
      const publicId = `avatars/${fileName.split(".")[0]}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Error while deleting old avatar" });
    }
  }

  // ✅ Step 2: Save new avatar URL in DB
  user.avatar = null;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user, "Avatar image deleted successfully")
  );
});

  


//delete cover image
const deleteCoverImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "The user with the provided details could not be found. Please check the information and try again.");
  }

  // 🔥 Step 1: Delete old avatar from Cloudinary (if exists)
  if (user.coverImage) {
    try {
      const segments = user.coverImage.split("/");
      const fileName = segments[segments.length - 1];
      const publicId = `covers/${fileName.split(".")[0]}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Error while deleting old avatar" });
    }
  }

  // ✅ Step 2: Save new avatar URL in DB
  user.coverImage = null;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user, "Cover image deleted successfully")
  );
});


const getUserChannel = asyncHandler(async (req, res) => {
    const { username } = req.params;
  
    if (!username?.trim()) {
      return res.status(400).json({ success: false, message: "Username is required" }); 
    }
  
    const channel = await User.aggregate([
      {
        $match: {
          username: username.toLowerCase()
        }
      },
      {
        $lookup: {
          from: "subscribes",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      {
        $lookup: {
          from: "subscribes",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscriptions"
        }
      },
      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "owner",
          as: "videos"
        }
      },
      {
        $addFields: {
          subscribersCount: { $size: { $ifNull: ["$subscribers", []] } },
          channelIsSubscribedToCount: { $size: { $ifNull: ["$subscriptions", []] } },
          videosCount: { $size: { $ifNull: ["$videos", []] } },
          channelIsSubscribedTo: {
            $cond: {
              if: {
                $in: [
                  req.user?._id || null,
                  {
                    $map: {
                      input: "$subscribers",
                      as: "s",
                      in: "$$s.subscriber"
                    }
                  }
                ]
              },
              then: true,
              else: false
            }
          }
        }
      },
      {
        $project: {
          channelId: "$_id", // expose _id as channelId
          fullname: 1,
          username: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
          channelIsSubscribedTo: 1,
          channelIsSubscribedToCount: 1,
          subscribersCount: 1,
          videosCount: 1
        }
      }
    ]);
  
    if (!channel?.length) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }
  
    return res.status(200).json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
  });
  
 


const getUserChannelById = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const currentUserId = req.user?._id?.toString();

  if (!channelId?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Channel ID is required",
      statusCode: 400
    });
  }

  const channelData = await User.aggregate([
    {
      $match: {
        channelId: channelId.toLowerCase(),
        status: { $ne: "deleted" }
      }
    },
    {
      $lookup: {
        from: "subscribes",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        pipeline: [{ $match: { status: "active" } }]
      }
    },
    {
      $lookup: {
        from: "subscribes",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscriptions",
        pipeline: [{ $match: { status: "active" } }]
      }
    },
    {
      $lookup: {
        from: "videos",
        let: { ownerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$owner", "$$ownerId"] },
                  { $eq: ["$visibility", "public"] },
                  { $ne: ["$status", "deleted"] }
                ]
              }
            }
          },
          {
            $lookup: {
              from: "views",
              localField: "_id",
              foreignField: "video",
              as: "views"
            }
          },
          {
            $lookup: {
              from: "likes",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$target", "$$videoId"] },
                        { $eq: ["$targetType", "Video"] },
                        { $eq: ["$action", "like"] }
                      ]
                    }
                  }
                }
              ],
              as: "likes"
            }
          },
          {
            $addFields: {
              viewCount: { $size: "$views" },
              likesCount: { $size: "$likes" },
              durationInSeconds: {
                $divide: [{ $subtract: ["$duration", 0] }, 1000]
              }
            }
          },
          {
            $project: {
              title: 1,
              description: 1,
              thumbnail: 1,
              videoUrl: 1,
              duration: 1,
              durationInSeconds: 1,
              viewCount: 1,
              likesCount: 1,
              commentsCount: 1,
              tags: 1,
              visibility: 1,
              createdAt: 1,
              updatedAt: 1
            }
          },
          { $sort: { createdAt: -1 } }
        ],
        as: "videos"
      }
    },
    {
      $lookup: {
        from: "playlists",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$owner", "$$userId"] },
              status: { $ne: "deleted" }
            }
          },
          {
            $lookup: {
              from: "videos",
              let: { videoIds: "$videos" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $in: ["$_id", "$$videoIds"] },
                        { $eq: ["$visibility", "public"] },
                        { $ne: ["$status", "deleted"] }
                      ]
                    }
                  }
                },
                {
                  $project: {
                    title: 1,
                    thumbnail: 1,
                    duration: 1,
                    viewCount: 1
                  }
                }
              ],
              as: "videoList"
            }
          },
          {
            $addFields: {
              videoCount: { $size: "$videoList" },
              previewVideos: { $slice: ["$videoList", 4] }
            }
          },
          {
            $project: {
              videoList: 0
            }
          },
          { $sort: { updatedAt: -1 } }
        ],
        as: "playlists"
      }
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        subscriptionsCount: { $size: "$subscriptions" },
        videosCount: { $size: "$videos" },
        totalViews: { $sum: "$videos.viewCount" },
        totalLikes: { $sum: "$videos.likesCount" },
        totalWatchTime: { $sum: "$videos.durationInSeconds" }
      }
    },
    {
      $project: {
        _id: 1,
        channelId: 1,
        username: 1,
        fullname: 1,
        avatar: 1,
        coverImage: 1,
        bio: 1,
        subscribersCount: 1,
        subscriptionsCount: 1,
        videosCount: 1,
        totalViews: 1,
        totalLikes: 1,
        totalWatchTime: 1,
        videos: 1,
        playlists: 1,
        createdAt: 1,
        updatedAt: 1,
        subscribers: 1
      }
    }
  ]);

  if (!channelData?.length) {
    return res.status(404).json({
      success: false,
      message: "Channel not found",
      statusCode: 404
    });
  }

  const channel = channelData[0];

  let channelIsSubscribedTo = false;
  let notificationPref = "none";

  if (currentUserId) {
    const matchedSub = channel.subscribers.find(
      (sub) => sub.subscriber?.toString() === currentUserId
    );

    if (matchedSub) {
      channelIsSubscribedTo = true;
      notificationPref = matchedSub.notificationPref || "none";
    }
  }

  const responseData = {
    ...channel,
    channelIsSubscribedTo,
    notificationPref,
    stats: {
      totalVideos: channel.videosCount,
      totalSubscribers: channel.subscribersCount,
      totalViews: channel.totalViews || 0,
      totalLikes: channel.totalLikes || 0,
      totalWatchTime: channel.totalWatchTime || 0
    }
  };

  delete responseData.subscribers;

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Channel data retrieved successfully",
    data: responseData
  });
});




const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "The provided playlist ID is invalid. Please check and try again.");
  }
  
  const playlist = await playlist.findById(playlistId).populate("videos");
  if (!playlist) {
    throw new ApiError(404, "The playlist with the specified ID could not be found. Please ensure the ID is correct.");
  }

  res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const changecurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    return res.status(400).json({
      success: false,
      message: "New password cannot be the same as the current password",
    });
  }
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message:
        "Password must include an uppercase, lowercase, number, special character, and be at least 8 characters",
    });
  }

  const passwordScore = zxcvbn(newPassword).score;
  if (passwordScore < 3) {
    return res.status(400).json({
      success: false,
      message: "Password is too weak. Try something more secure.",
    });
  }

  
 
  await user.save(); // will trigger pre-save hook for hashing
 
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});


const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!password || (!username && !email)) {
    return res.status(400).json({
      success: false,
      message: "Username/email and password are required",
    });
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  }).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  const isMatch = await user.isPasswordCorrect(password);
  
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  };

  res
    .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, {
      user: safeUser,
      accessToken,
      refreshToken,
    }, "User logged in successfully")
  );
});


// const getWatchHistory = asyncHandler(async (req, res) => {
//   try {
//     // Step 1: Track user based on user ID from req.user
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID is required",
//       });
//     }

//     // Step 2: Aggregate user’s watch history and populate video + video.owner
//     const userData = await User.aggregate([
//       {
//         $match: {
//           _id: new mongoose.Types.ObjectId(userId),
//         },
//       },
//       {
//         $lookup: {
//           from: "videos", // Name of your videos collection
//           localField: "watchHistory", // This is an array of video _id references
//           foreignField: "_id", // Match the _id field in videos collection
//           as: "watchHistory", // Embed full video documents in the result
//           pipeline: [
//             {
//               $lookup: {
//                 from: "users", // Lookup video owners
//                 localField: "owner", // Video's owner field
//                 foreignField: "_id", // Match against the users collection
//                 as: "owner", // Store owner details in 'owner' array
//                 pipeline: [
//                   {
//                     $project: {
//                       fullname: 1,
//                       username: 1,
//                       avatar: 1,
//                     },
//                   },
//                 ],
//               },
//             },
//             {
//               $addFields: {
//                 owner: { $arrayElemAt: ["$owner", 0] }, // Flatten owner array
//               },
//             },
//           ],
//         },
//       },
//       {
//         $project: {
//           watchHistory: 1, // Only include the watchHistory field
//         },
//       },
//     ]);

//     // Step 3: Handle if user/watchHistory not found
//     if (!userData || userData.length === 0 || !userData[0].watchHistory) {
//       return res.status(404).json({
//         success: false,
//         message: "No watch history found for this user",
//       });
//     }

//     // Step 4: Return successful response with watch history
//     return res.status(200).json({
//       success: true,
//       data: userData[0].watchHistory,
//       message: "Watch history fetched successfully",
//     });
//   } catch (error) {
//     console.error("Error in getWatchHistory:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// });




const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    // Step 1: Track user based on user ID from req.user
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Step 2: Aggregate user’s watch history and populate video + video.owner
    const userData = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "videos", // Name of your videos collection
          localField: "watchHistory", // This is an array of video _id references
          foreignField: "_id", // Match the _id field in videos collection
          as: "watchHistory", // Embed full video documents in the result
          pipeline: [
            {
              $lookup: {
                from: "users", // Lookup video owners
                localField: "owner", // Video's owner field
                foreignField: "_id", // Match against the users collection
                as: "owner", // Store owner details in 'owner' array
                pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: { $arrayElemAt: ["$owner", 0] }, // Flatten owner array
              },
            },
          ],
        },
      },
      {
        $project: {
          watchHistory: 1, // Only include the watchHistory field
        },
      },
    ]);

    // Step 3: Handle if user/watchHistory not found
    if (!userData || userData.length === 0 || !userData[0].watchHistory) {
      return res.status(404).json({
        success: false,
        message: "No watch history found for this user",
      });
    }

    // Step 4: Return successful response with watch history
    return res.status(200).json({
      success: true,
      data: userData[0].watchHistory,
      message: "Watch history fetched successfully",
    });
  } catch (error) {
    console.error("Error in getWatchHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});




// CLEAR ENTIRE WATCH HISTORY
const clearWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { watchHistory: [] } },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Watch history cleared successfully"));
});

// REMOVE SPECIFIC VIDEO FROM WATCH HISTORY
const removeWatchHistoryVideo = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid video ID"));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $pull: { watchHistory: videoId } },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video removed from watch history"));
});



// Add to Watch Later
export const addToWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

 if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.watchLater.includes(videoId)) {
    return res.status(200).json(new ApiResponse(200, {}, "Video already in Watch Later"));
  }

  user.watchLater.push(videoId);
  await user.save();

  return res.status(200).json(new ApiResponse(200, {}, "Video added to Watch Later"));
});

// Remove from Watch Later
export const removeFromWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { watchLater: videoId } },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, {}, "Video removed from Watch Later"));
});

// Get Watch Later list
export const getWatchLater = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "watchLater",
    populate: { path: "owner", select: "username avatar" },
  });

  return res.status(200).json(new ApiResponse(200, { videos: user.watchLater }, "Watch Later fetched"));
});


// get liked video
export const getLikedVideos = asyncHandler(async (req, res) => {

  const user = await User.findById(req.user._id).populate({
    path: "likedVideos",
    populate: { path: "owner", select: "username avatar" },
  });

  return res.status(200).json(new ApiResponse(200, { videos: user.likedVideos }, "Liked videos fetched"));
});

// 
// controllers/authController.js


// Setup 2FA - generate secret and QR code
export const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `YourApp:${user.email}`,
      length: 20,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Save temp secret for verification later
    user.temp2FASecret = secret.base32;
    await user.save();

    return res.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Verify 2FA code
export const verify2FACode = async (req, res) => {
  try {
    const { code, secret } = req.body;
    console.log("code:", code, "secret:", secret);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    console.log("verified:", verified);

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.twoFactorSecret = secret;
    user.settings.twoFactorEnabled = true;
    user.temp2FASecret = undefined;
    await user.save();

    return res.json({ message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.twoFactorSecret = undefined;
    user.settings.twoFactorEnabled = false;
    await user.save();

    return res.json({ message: 'Two-factor authentication disabled' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// delete account
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ✅ 1. Delete avatar from Cloudinary
  if (user.avatar) {
    try {
      const segments = user.avatar.split("/");
      const fileName = segments[segments.length - 1];
      const publicId = `avatars/${fileName.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.log("Error deleting avatar:", err.message);
    }
  }

  // ✅ 2. Delete videos uploaded by the user
  const userVideos = await Video.find({ owner: userId });
  for (const video of userVideos) {
    if (video.videoFile) {
      try {
        const segments = video.videoFile.split("/");
        const fileName = segments[segments.length - 1];
        const publicId = `videos/${fileName.split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      } catch (err) {
        console.log("Error deleting video from Cloudinary:", err.message);
      }
    }
    await video.deleteOne(); // or Video.deleteOne({ _id: video._id })
  }

  // ✅ 3. Delete playlists created by user
  await Playlist.deleteMany({ owner: userId });

  // ✅ 4. Delete comments/likes (optional cleanup)
  await Comment.deleteMany({ user: userId });
  await Like.deleteMany({ user: userId });

  // ✅ 5. Finally, delete the user account
  await user.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, null, "User account and all data deleted successfully")
  );
});


const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

export const getAuthUrl = async (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');

    await User.findByIdAndUpdate(req.user.id, {
      'youtube.authState': state
    });

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent'
    });

    res.json({ authUrl: url });
  } catch (error) {
    console.error('Error generating YouTube auth URL:', error);
    res.status(500).json({ message: 'Failed to generate YouTube auth URL' });
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    const user = await User.findById(req.user.id);
    if (!user || user.youtube?.authState !== state) {
      return res.status(400).json({ message: 'Invalid state parameter' });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });

    const channel = channelResponse.data.items[0];
    const channelInfo = {
      id: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails.default.url
    };

    user.youtube = {
      connected: true,
      channel: channelInfo,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      authState: undefined
    };

    await user.save();

    res.send('<script>window.close();</script>');
  } catch (error) {
    console.error('Error handling YouTube callback:', error);
    res.status(500).json({ message: 'Failed to connect YouTube account' });
  }
};

export const disconnectYouTube = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'youtube.connected': false,
          'youtube.channel': null,
          'youtube.accessToken': null,
          'youtube.refreshToken': null,
          'youtube.expiryDate': null,
          'youtube.autoUpload': false
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'YouTube account disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting YouTube:', error);
    res.status(500).json({ message: 'Failed to disconnect YouTube account' });
  }
};

export const checkYouTubeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      connected: user.youtube?.connected || false,
      channel: user.youtube?.channel || null
    });
  } catch (error) {
    console.error('Error checking YouTube status:', error);
    res.status(500).json({ message: 'Failed to check YouTube status' });
  }
};


  export {

    registerUser,
    loginUser,
    socialLogin,
    logoutUser,
    refreshAccessToken,
    changecurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    forgetPassword,
    verifyOtp,
    updateUserAvatar,
    updateUserCoverImage,
    deleteAvatar,
    deleteCoverImage,
    getPlaylistById,
    getUserChannel,
    getUserChannelById,
    getWatchHistory,
    clearWatchHistory,
    removeWatchHistoryVideo
}


