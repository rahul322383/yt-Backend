import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto"; // ✅ Needed for `crypto.randomUUID`


const userSchema = new Schema(
  {
    signupType: {
      type: String,
      enum: ["email", "google", "github", "facebook"],
      default: "email"
    },
    isAdmin: {
  type: Boolean,
  default: true // Default to true for admin users
},
    isBlocked: {
      type: Boolean,
      default: false
    },
    providerId: {
      type: String,
      default: null
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, 
      index: true
    },
    email: {
      type: String,
      required: true, // optional for testing
      unique: true,
      trim: true,
      lowercase: true 
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select : false
    },
    fullName: {
      type: String,
      required: false,
      trim: true,
      index: true
    },
    avatar: {
      type: String,
      required: false
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    otpRequestedAt: Date, // for rate limiting
    isOtpVerified: { type: Boolean, default: false },
    coverImage: {
      type: String
    },
    // channelId: {
    //   type: String,
    //   // type:mongoose.Schema.Types.ObjectId,
    //   ref: "user",
    // },
    channelId: {
      type: String,
      // unique: true,
      required: true,
      default: () => `channel_${crypto.randomUUID().slice(0, 12)}`
    },
    watchHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video"
    }],
   
lastWatchedAt: Date
    ,
    
    refreshToken: {
      type: String
    },
     watchLater: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    likedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    dislikedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],

  },
  {
    timestamps: true
  }
);

// 🔐 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Password comparison method
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ✅ Generate Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      channelId: this.channelId,
      role: this.isAdmin ? "admin" : "user" // Add role based on isAdmin
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME
    }
  );
};

// ✅ Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME
    }
  );
};

export const User = mongoose.model("User", userSchema);
