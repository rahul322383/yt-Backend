import mongoose, { Schema } from "mongoose";
import settingsSchema from "./sttings.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const userSchema = new Schema(
  {
    signupType: {
      type: String,
      enum: ["email", "google", "github", "facebook"],
      default: "email"
    },
    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    providerId: { type: String, default: null },

    username: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: function () {
        return this.signupType === "email";
      },
      select: false
    },
    fullName: { type: String, trim: true },
    avatar: String,
    coverImage: String,

    // Auth fields
    refreshToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    otpRequestedAt: Date,
    isOtpVerified: { type: Boolean, default: false },

    // 2FA fields
    twoFactorSecret: { type: String, default: null },
    temp2FASecret: { type: String, default: null },

    // Channel ID
     // channelId: {
    //   type: String,
    //   // type:mongoose.Schema.Types.ObjectId,
    //   ref: "user",
    // },
    channelId: {
      type: String,
      unique: true,
      required: true,
      default: () => `channel_${uuidv4().slice(0, 12)}`
    },

    // Watch history & preferences
    watchHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video"
    }],
    

    watchLater: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    likedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    dislikedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],

    // Settings sub-schema
    settings: {
      type: settingsSchema,
      default: () => ({})
    },

    // YouTube OAuth integration
    youtube: {
      connected: { type: Boolean, default: false },
      channel: {
        id: String,
        title: String,
        thumbnail: String
      },
      accessToken: String,
      refreshToken: String,
      expiryDate: Date,
      authState: String,
      autoUpload: { type: Boolean, default: false }
    },

    isDefault: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);


// 🔐 Hash password before saving (email-based only)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// 🔐 Compare raw vs hashed password
userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

// 🔐 JWT Access Token (short-lived)
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      channelId: this.channelId,
      role: this.isAdmin ? "admin" : "user"
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME || "15m"
    }
  );
};

// 🔐 JWT Refresh Token (long-lived)
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME || "7d"
    }
  );
};

export const User = mongoose.model("User", userSchema);
