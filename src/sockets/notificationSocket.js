// sockets/notificationSocket.js
const connectedUsers = {};

export const handleNotificationSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    socket.on("join", (userId) => {
      connectedUsers[userId] = socket.id;
      console.log(`✅ User ${userId} joined with socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
      for (let userId in connectedUsers) {
        if (connectedUsers[userId] === socket.id) {
          delete connectedUsers[userId];
          console.log(`❌ User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};

export const getConnectedUsers = () => connectedUsers;
