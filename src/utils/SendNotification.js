// utils/sendNotification.js
export const sendNotification = (app, userId, message) => {
  const io = app.get("io");
  const connectedUsers = app.get("connectedUsers");

  const socketId = connectedUsers[userId];
  if (socketId) {
    io.to(socketId).emit("newNotification", { message });
  }
};
