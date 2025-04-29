import mongoose from 'mongoose';
import { User } from './user.model.js';
import { v4 as uuidv4 } from 'uuid';

const channelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // One channel per user
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
      default: () => `channel_${uuidv4().slice(0, 12)}`, // Automatically generates a channelId
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    banner: {
      type: String,
      default: ''
    },
    subscribersCount: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Optional: Add a compound index to speed up lookups
channelSchema.index({ channelId: 1, user: 1 });

const Channel = mongoose.model('Channel', channelSchema);

export default Channel;
