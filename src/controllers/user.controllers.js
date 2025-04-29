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
import {v2 as cloudinary} from 'cloudinary';
import Channel from '../models/channel.model.js';



// Token generator
const generateAccessTokenAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

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
      providerId, // unique ID from Google/GitHub/Facebook
      avatarUrl, // optional avatar URL from OAuth provider
      coverUrl,
      ...rest
    } = req.body;

    // Basic validations
    if (signupType === "email") {
      if ([fullName, email, username, password].some(field => !field?.trim())) {
        return res.status(400).json(new ApiResponse(400, null, "Missing required fields"));
      }
    } else {
      if (!email || !providerId || !signupType) {
        return res.status(400).json(new ApiResponse(400, null, "Missing required fields"));
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
    
    let coverUpload = null;
    if (coverImageLocalPath) {
      coverUpload = await uploadOnCloudinary(coverImageLocalPath);
    }

    // let coverUpload = coverImageLocalPath
    //   ? await uploadOnCloudinary(coverImageLocalPath)
    //   : null;
      

      if (signupType === "email" && !avatarUpload?.url) {
        return res.status(400).json({
          success: false,
          message: "Avatar is required for email signup",
        });
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
      return res.status(500).json({
        success: false,
        message: "User creation failed",
      });
      
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
      return res
      .status(409)
      .json(new ApiResponse(409, null, `${duplicateField} is already in use`));

    }

    return res.status(error.statusCode || 500).json(
      new ApiResponse(
        error.statusCode || 500,
        null,
        error.message || "Internal Server Error"
      )
    );
    
  }
});


// LOGIN
// const loginUser = asyncHandler(async (req, res) => {
//   const { username, email, password } = req.body;
//   console.log ("req.body", req.body);


//   if (!password || (!username && !email)) {
//     return res.status(400).json({
//       success: false,
//       message: "Username/email and password are required",
//     });
    
//   }
//   console.log(username, email, password);

//   const user = await User.findOne({
//     $or: [{ username }, { email }],
//   });
//   console.log(user);

//   if (!user || !(await user.isPasswordCorrect(password))) {
//      return res.status(500)
//      .json({
//       success: false,
//       message: "Invalid credentials",
//     })
//   }
//   // 🔐 Generate tokens
//   const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

//   const isProd = process.env.NODE_ENV === "production";
//   const cookieOptions = {
//     httpOnly: true,
//     secure: isProd,
//     sameSite: isProd ? "None" : "Lax",
//   };

//   res
//     .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 })
//     .cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });

//   const safeUser = await User.findById(user._id).select("-password -refreshToken");

//   return res.status(200).json(new ApiResponse(200, {
//     user: safeUser,
//     accessToken,
//     refreshToken,
//   }, "User logged in successfully"));
// });





const socialLogin = async (req, res) => {
  const { token, provider } = req.body;

  try {
    if (!token || !provider) {
      return res.status(400).json({ success: false, message: "Token and provider are required" });
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
      return res.status(400).json({ success: false, message: "Unsupported provider" });
    }

    if (!userData?.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required from provider",
      });
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
  try {
    await fs.access(avatarLocalPath); // Check if file exists
    await fs.unlinkAsync(avatarLocalPath); // Delete it
  } catch (err) {
    if (err.code !== "ENOENT") {
      return res.status(400).json({ success: false, message: "Error while deleting local file" });
    }
  }
  

  return res.status(200).json(
    new ApiResponse(200, user, "Avatar image updated successfully")
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
  
  
//first i will generate  playlisId after that i will accesing playlist {++(mini =6 mixi =undefined)logic for playlistId}
//


const getUserChannelById = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  console.log("Received channelId:", channelId);

  if (!channelId?.trim()) {
    return res.status(400).json({ success: false, message: "channelId is required" });
  }

  const channel = await User.aggregate([
    {
      $match: {
        channelId: channelId.toLowerCase()
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
        channelId: 1,
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

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
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


//first track user based on user id
//first get all videos  after that show all videos in watchHistory
const getwatchHistory = asyncHandler(async (req, res) => {
  try {
    // Step 1: Track user based on user ID (the user ID is fetched from req.user)
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Step 2: Get all videos the user has watched (via watchHistory array in the User document)
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory", // watchHistory stores video IDs
          foreignField: "_id",
          as: "watchHistory", // This will store the fetched videos
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner", // Get the user who owns the video
                foreignField: "_id",
                as: "owner",
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
                owner: { $arrayElemAt: ["$owner", 0] }, // Flatten the owner array to access the data
              },
            },
          ],
        },
      },
      {
        $project: {
          watchHistory: 1, // Include only the watchHistory field
        },
      },
    ]);

    // Check if user is found and has watch history
    if (!user || user.length === 0 || !user[0].watchHistory) {
      return res.status(404).json({
        success: false,
        message: "No watch history found for this user",
      });
    }

    // Step 3: Return the watch history
    return res.status(200).json(
      new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    );
  } catch (error) {
    // Error handling
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// const getwatchHistory = asyncHandler(async(req,res)=>{

//     const user =await User.aggregate([
//         {
//             $match: {
//                 _id: new mongoose.Types.ObjectId(req.user?._id)
//             }
//         },
//         {
//             $lookup:{
//                 from: "videos",
//                 localField: "watchHistory",
//                 foreignField: "_id",
//                 as: "watchHistory",
//                 pipeline: [
//                     {
//                         $lookup:{
//                             from: "users",
//                             localField: "owner",
//                             foreignField: "_id",
//                             as: "owner",
//                             pipeline: [
//                                 {
//                                     $project:{
//                                         fullname: 1,
//                                         username: 1,
//                                         avatar: 1,
//                                     }
//                                 },
                                
//                             ]

//                         }
//                     },
//                     {                    
//                     $addFields: {
//                         owner: {
//                              $arrayElemAt: ["$owner", 0] }
//                         }
                        
//                     },
                    
                    
//                 ]
//             }
//         },
//         {
//             $project:{
//                 watchHistory: 1
//             }
//         }
//     ])

//     return res.status(200).json(
//         new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully")
//     )
// })  




// import sendEmail from '../utils/SendEmail.js';


// const generateResetLink = (email) => {
//   const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
//   return `http://localhost:5173/reset-password/${token}`; // Adjust to your frontend URL
// };

// const forgotPassword = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).send("Email is required.");
//   }

//   try {
//     // Check if the email exists in the database
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).send("User with this email does not exist.");
//     }

//     // Generate the reset link
//     const resetLink = generateResetLink(email);
//     const subject = "🔐 Password Reset Request";
//     const html = `
//       <p>Hi,</p>
//       <p>You requested a password reset. Click the link below to reset your password:</p>
//       <p><a href="${resetLink}">Reset Password</a></p>
//       <p>This link will expire in 1 hour.</p>
//       <p>If you did not request this, please ignore this email.</p>
//     `;

//     // Send the reset email
//     await sendEmail(email, subject, html);

//     // Respond with success message
//     res.status(200).send("Password reset email sent.");
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).send("Error sending email.");
//   }
// };

// export { forgotPassword };






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

// const changecurrentPassword = asyncHandler(async (req, res) => {
//   const { username, email, currentPassword, newPassword } = req.body;

//   const user = await User.findById(req.user._id);
//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: "User not found",
//     });
//   }

//   const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
//   console.log(isPasswordCorrect);
//   if (!isPasswordCorrect) {
//     return res.status(401).json({
//       success: false,
//       message: "Current password is incorrect",
//     });
//   }

//   if (await bcrypt.compare(newPassword, user.password)) {
//     return res.status(400).json({
//       success: false,
//       message: "New password cannot be the same as the current password",
//     });
//   }

//   const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//   if (!passwordRegex.test(newPassword)) {
//     return res.status(400).json({
//       success: false,
//       message:
//         "Password must include an uppercase, lowercase, number, and special character and be at least 8 characters",
//     });
//   }

//   const passwordScore = zxcvbn(newPassword).score;
//   if (passwordScore > 5) {
//     return res.status(400).json({
//       success: false,
//       message: "Password is too weak. Try something more secure.",
//     });
//   }

//   if (!username || !email) {
//     return res.status(400).json({
//       success: false,
//       message: "Username and email are required",
//     });
//   }

//   // ✅ Set raw password — let Mongoose pre-save middleware hash it
//   user.password = newPassword;
//   console.log(user.password);

//   // ✅ Just save — Mongoose will hash the password automatically
//   await user.save(); // Do NOT disable hooks or validation
//   console.log(user.password);

//   return res
//     .status(200)
//     .json(new ApiResponse(200, null, "Password changed successfully"));
// });





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


