import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";  // THIS is your auth middleware
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from "../controllers/notificatonController.js"
const router = express.Router();

// Protect all notification routes - user must be logged in
// router.use(verifyJWT);

// Get all notifications for the logged-in user
router.get("/", getNotifications);

// Mark a specific notification as read
router.post("/:id/mark-read", markNotificationRead);

// Mark all notifications as read
router.post("/mark-all-read", markAllNotificationsRead);

export default router;
