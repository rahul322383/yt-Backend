// settings.model.js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  theme: { type: String, default: "system" },
  notifications: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  language: { type: String, default: "en" },
  timezone: { type: String, default: "Asia/Kolkata" },

  twoFactorEnabled: { type: Boolean, default: false },
  backupEmail: { type: String, default: "" },

  dataExport: { type: Boolean, default: false },
  autoPlayVideos: { type: Boolean, default: true },
  videoQuality: { type: String, default: "auto" },
  downloadQuality: { type: String, default: "hd" },

  darkModeSchedule: { type: String, default: "system" },
  darkModeStart: { type: String, default: "20:00" },
  darkModeEnd: { type: String, default: "07:00" }
});

// ⚠️ DO NOT export as mongoose.model() — just export the schema!
export default settingsSchema;
