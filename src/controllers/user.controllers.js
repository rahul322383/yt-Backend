import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import zxcvbn from 'zxcvbn';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
// import fs from 'fs';
import {v2 as cloudinary} from 'cloudinary';
import streamifier from 'streamifier';
// import unlinkAsync from 'util/promisify';
import {promisify} from 'util';
// const unlinkAsync = promisify(fs.unlink);
import fs from 'fs/promises';
// import cloudinary from '../utils/cloudinary.config.js';



// Token generator
const generateAccessTokenAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (typeof user.generateAccessToken !== "function" || typeof user.generateRefreshToken !== "function") {
    throw new ApiError(500, "Token generation methods missing in User model");
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
      providerId, // unique ID from Google/GitHub/Facebook
      avatarUrl, // optional avatar URL from OAuth provider
      ...rest
    } = req.body;

    // Basic validations
    if (signupType === "email") {
      if ([fullName, email, username, password].some(field => !field?.trim())) {
        throw new ApiError(400, "All required fields must be provided for email signup");
      }
    } else {
      if (!email || !providerId || !signupType) {
        throw new ApiError(400, "Missing required fields for social signup");
      }
    }

    // 🔍 Check for duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json(
        new ApiResponse(409, null, "Email is already registered")
      );
    }

    // 🔍 Check for duplicate username (only for email signup)
    if (signupType === "email") {
      const existingUsername = await User.findOne({ username: username?.toLowerCase() });
      if (existingUsername) {
        return res.status(409).json(
          new ApiResponse(409, null, "Username is already taken")
        );
      }
    }

    // 🔍 Check for duplicate OAuth providerId
    if (signupType !== "email") {
      const existingOAuth = await User.findOne({ providerId, signupType });
      if (existingOAuth) {
        return res.status(409).json(
          new ApiResponse(409, null, `${signupType} account already exists`)
        );
      }
    }

    // 📂 File handling
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.cover?.[0]?.path;

    let avatarUpload = null;
    if (avatarLocalPath) {
      avatarUpload = await uploadOnCloudinary(avatarLocalPath);
    }
    

    const coverUpload = coverImageLocalPath
      ? await uploadOnCloudinary(coverImageLocalPath)
      : null;

    if (signupType === "email" && !avatarUpload?.url) {
      throw new ApiError(400, "Avatar is required for email signup");
    }

    // 👤 Create user
    const newUser = await User.create({
      fullName,
      email,
      username: username?.toLowerCase(),
      password: signupType === "email" ? password : undefined,
      providerId: signupType !== "email" ? providerId : undefined,
      signupType,
      avatar: avatarUpload?.url || avatarUrl || "",
      coverImage: coverUpload?.url || coverUrl || "",
      ...rest,
    });

    if (!newUser) {
      throw new ApiError(500, "User creation failed");
    }

    // 🔐 Generate tokens
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(newUser._id);

    // 💾 Save refresh token
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // 🍪 Set cookies
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

    // ✅ Return created user (without password and refreshToken)
    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");
    // const createdUser = await User.findById(newUser.username).select("-password -refreshToken");

    return res.status(201).json(
      new ApiResponse(201, {
        user: createdUser,
        accessToken,
      }, "User created successfully")
    );

  } catch (error) {
    console.error("Register Error:", error);

    // Handle MongoDB duplicate key error (fallback)
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      return res.status(409).json(
        new ApiResponse(409, null, `${duplicateField} is already in use`)
      );
    }

    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message || "Internal Server Error")
    );
  }
});


// LOGIN
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;



  if (!password || (!username && !email)) {
    throw new ApiError(400, "Username/email and password are required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, "Invalid credentials");
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
    .cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, {
    user: safeUser,
    accessToken,
    refreshToken,
  }, "User logged in successfully"));
});


const socialLogin = async (req, res) => {
  const { token, provider } = req.body;

  try {
    if (!token || !provider) {
      throw new ApiError(400, "Token and provider are required");
    }

    let userData = null;

    // 🔹 Verify provider token & extract user info
    if (provider === "google") {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { email, name, picture } = response.data;
      userData = { email, fullName: name, avatar: picture || "default-avatar-url" };
    } else if (provider === "github") {
      const userResp = await axios.get(`https://api.github.com/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const emailResp = await axios.get(`https://api.github.com/user/emails`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const email = emailResp.data.find(e => e.primary && e.verified)?.email;
      userData = {
        email,
        fullName: userResp.data.name || userResp.data.login,
        avatar: userResp.data.avatar_url || "default-avatar-url"
      };
    } else if (provider === "facebook") {
      const fbResp = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${token}`
      );
      const { email, name, picture } = fbResp.data;
      userData = {
        email,
        fullName: name,
        avatar: picture?.data?.url || "default-avatar-url"
      };
    } else {
      throw new ApiError(400, "Unsupported provider");
    }

    if (!userData?.email) {
      throw new ApiError(400, "Email is required from provider");
    }

    // 🔸 Check for existing user
    let user = await User.findOne({ email: userData.email });

    // 🔸 If not exist, create user
    if (!user) {
      user = await User.create({
        fullName: userData.fullName,
        email: userData.email,
        username: userData.email.split("@")[0], // basic username
        avatar: userData.avatar,
        password: "", // No password for social login
        loginType: provider,
      });
    }

    // 🔸 Generate JWTs
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    // 🔸 Set cookies
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
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

    // 🔸 Respond with user
    const sanitizedUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(200).json(
      new ApiResponse(200, {
        user: sanitizedUser,
        accessToken,
      }, "Logged in successfully via " + provider)
    );
  } catch (error) {
    console.error("Social Login Error:", error.message);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message || "Social login failed")
    );
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
    throw new ApiError(400, "Refresh token is required");
  }

  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find user associated with the refresh token
    const user = await User.findById(decodedToken?._id);
    
    if (!user) {
      throw new ApiError(404, "User not found || Invalid token");
    }
    
    // Check if the refresh token matches the one stored for the user
    if (!user.refreshToken || incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid or expired refresh token");
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



const changecurrentPassword = asyncHandler(async (req, res) => {
  const { username, email, currentPassword, newPassword} = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) throw new ApiError(401, "Current password is incorrect");

  if (await bcrypt.compare(newPassword, user.password)) {
    throw new ApiError(400, "New password cannot be the same as the current password");
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new ApiError(400, "Password must include an uppercase, lowercase, number, and special character and be at least 8 characters");
  }

  const passwordScore = zxcvbn(newPassword).score;
  if (passwordScore > 5) {//after testing we can change this
    throw new ApiError(400, "Password is too weak. Try something more secure.");
  }

  if (!username || !email) {
    throw new ApiError(400, "Username or email must be provided");
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, user, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized: User not found in request");
  }

  return res.status(200).json(
    new ApiResponse(200, req.user, "User fetched successfully")
  );
});




// const updateAccountDetails = asyncHandler(async (req, res) => {
//     const { fullName, email } = req.body;
  
//     if (!fullName || !email) {
//       throw new ApiError(400, "All fields are required");
//     }
  
//     const user = await User.findByIdAndUpdate(
//       req.user._id,
//       {
//         $set: {
//           fullName,
//           email: email.toLowerCase(),
//         },
//       },
//       { new: true }
//     ).select("-password -refreshToken");
  
//     return res.status(200).json(
//       new ApiResponse(200, user, "User details updated successfully")
//     );
// });


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

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP for security before saving
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    // Save OTP and expiry to user
    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpires = expiry;
    await user.save({ validateBeforeSave: false });
    //after testing change it
    // Send OTP email
    // const transporter = nodemailer.createTransport({
    //   service: 'Gmail',
    //   auth: {
    //     user: process.env.SMTP_EMAIL,
    //     pass: process.env.SMTP_PASSWORD,
    //   },
    // });

    // const message = `Your password reset OTP is: ${otp}\nThis OTP will expire in 10 minutes.`;

    // await transporter.sendMail({
    //   from: process.env.SMTP_EMAIL,
    //   to: user.email,
    //   subject: 'Password Reset OTP',
    //   text: message,
    // });

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email address',
    });

  } catch (error) {
    console.error('Forget Password Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Find user with matching OTP and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedOtp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'OTP is invalid or has expired' });
    }

    // Clear token fields so they can't be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.isOtpVerified = true; // Optional: mark user as verified
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};





 const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");//give better message for user not found
  }

  // 🔥 Step 1: Delete old avatar from Cloudinary (if exists)
  if (user.avatar) {
    try {
      const segments = user.avatar.split("/");
      const fileName = segments[segments.length - 1];
      const publicId = `avatars/${fileName.split(".")[0]}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.warn("⚠️ Failed to delete old avatar:", err.message);
    }
  }

  // 🚀 Step 2: Upload new image to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // ✅ Step 3: Save new avatar URL in DB
  user.avatar = avatar.url;
  await user.save();

  // 🧼 Step 4: Cleanup temp local file (safely)
  try {
    await fs.access(avatarLocalPath); // Check if file exists
    await fs.unlinkAsync(avatarLocalPath); // Delete it
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("⚠️ Failed to delete local file:", err.message);
    }
  }
  

  return res.status(200).json(
    new ApiResponse(200, user, "Avatar image updated successfully")
  );
});


  
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
  
    if (!coverImageLocalPath) {
      throw new ApiError(400, "Image is required");
    }
  
    const uploaded = await uploadOnCloudinary(coverImageLocalPath);
    const imageUrl = uploaded?.secure_url || uploaded?.url;
  
    if (!imageUrl) {
      throw new ApiError(500, "Error while uploading cover image");
    }
  
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { coverImage: imageUrl } },
      { new: true }
    ).select("-password -refreshToken");
  
    return res.status(200).json(
      new ApiResponse(200, user, "Cover image updated successfully")
    );
  });

  const getUserChannel = asyncHandler(async (req, res) => {
    const { username } = req.params;
  
    if (!username?.trim()) {
      throw new ApiError(400, "Username is required");
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
      throw new ApiError(404, "Channel not found");
    }
  
    return res.status(200).json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
  });
  
  
//first i will generate  playlisId after that i will accesing playlist {++(mini =6 mixi =undefined)logic for playlistId}
//

const getUserChannelById = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId?.trim()) {
    throw new ApiError(400, "Channel ID is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        channelId: channelId
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
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos"
      }
    },
    {
      $addFields: {
        subscribersCount: { $size: { $ifNull: ["$subscribers", []] } },
        videosCount: { $size: { $ifNull: ["$videos", []] } }
      }
    },
    {
      $project: {
        _id: 1,
        channelId: 1,
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        subscribersCount: 1,
        videosCount: 1
      }
    }
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res.status(200).json(
    new ApiResponse(200, channel[0], "User channel fetched successfully")
  );
});




const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await playlist.findById(playlistId).populate("videos");
  if (!playlist) {
      throw new ApiError(404, "Playlist not found");
  }

  res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});


//first track user based on user id
//first get all videos  after that show all videos in watchHistory
const getwatchHistory = asyncHandler(async(req,res)=>{

    const user =await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project:{
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                },
                                
                            ]

                        }
                    },
                    {                    
                    $addFields: {
                        owner: {
                             $arrayElemAt: ["$owner", 0] }
                        }
                        
                    },
                    
                    
                ]
            }
        },
        {
            $project:{
                watchHistory: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully")
    )
})  

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
    getPlaylistById,
    getUserChannel,
    getUserChannelById,
    getwatchHistory
}


