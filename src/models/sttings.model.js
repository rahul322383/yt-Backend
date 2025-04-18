import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  account: {
    name: { type: String },
    email: { type: String }
  },
  advancedSettings: {
    autoPlay: { type: Boolean, default: true }
  },
  billing: {
    plan: { type: String, default: 'free' },
    paymentMethod: { type: String }
  },
  connectedApps: {
    google: { type: Boolean, default: false },
    facebook: { type: Boolean, default: false }
  },
  downloads: {
    wifiOnly: { type: Boolean, default: true }
  },
  notification: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  placeholder: {
    enabled: { type: Boolean, default: false }
  },
  playback: {
    quality: { type: String, default: 'auto' },
    subtitles: { type: Boolean, default: true }
  },
  privacy: {
    showProfilePicture: { type: Boolean, default: true },
    allowMessages: { type: Boolean, default: true }
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  settings: settingsSchema,
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
