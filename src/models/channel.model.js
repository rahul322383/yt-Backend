import mongoose from 'mongoose';  
import { v4 as uuidv4 } from 'uuid';


const channelSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `channel_${uuidv4().slice(0, 12)}`,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    subscribersCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    _id: false, // We handle _id ourselves as string
  }
);


// Optional: Add a compound index to speed up lookups
channelSchema.index({ channelId: 1, user: 1 });

const Channel = mongoose.model('Channel', channelSchema);

export default Channel;
