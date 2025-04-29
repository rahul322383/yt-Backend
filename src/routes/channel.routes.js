import express from "express";
import { createChannel, getChannelByName, updateChannel, deleteChannel } from "../controllers/Channel.controllers.js";

const router = express.Router();

// Create a channel
router.post("channel", createChannel);


// Get a user's channel details
router.get("/c/channel/:username", getChannelByName);

// Update user's channel details (avatar/coverImage)
router.put("/c/channel/:username", updateChannel);

// Delete user's channel
router.delete("/c/channel/:username", deleteChannel);

export default router;
