import Notification from "../models/Notification.model.js";

// GET /notifications
// Fetch all notifications, newest first (PUBLIC)
// 

export const createNotification = async ({ recipient, sender, type, entityId, message }) => {
  try {
    const notification = new Notification({ recipient, sender, type, entityId, message });
    await notification.save();

    // Optional: Push real-time event via Socket.io or WebSocket here
    // io.to(recipient).emit("notification", notification);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /notifications/:id/read
// Mark a single notification as read (PUBLIC)
export const markNotificationRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /notifications/mark-all-read
// Mark ALL notifications as read (PUBLIC)
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
