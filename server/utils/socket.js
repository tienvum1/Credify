const { Server } = require("socket.io");

let io;
const userSockets = new Map(); // Lưu trữ userId -> socketId

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'https://credify-awqh.vercel.app',
        'https://credify-awqh-tienvum1s-projects.vercel.app',
        "https://credifyapp.site",
        "https://www.credifyapp.site"
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Khi người dùng tham gia và gửi userId
    socket.on("join", (userId) => {
      if (userId) {
        userSockets.set(String(userId), socket.id);
        console.log(`User ${userId} joined with socket ${socket.id}`);
        // Tham gia room riêng của user
        socket.join(`user_${userId}`);
      }
    });

    // Tham gia room cho Staff/Admin
    socket.on("join_staff", () => {
      socket.join("staff_room");
      console.log(`Socket ${socket.id} joined staff_room`);
    });

    socket.on("disconnect", () => {
      // Xóa userId khỏi Map khi ngắt kết nối
      for (let [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Gửi thông báo cho một user cụ thể
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

// Gửi thông báo cho tất cả Staff
const sendToStaff = (event, data) => {
  if (io) {
    io.to("staff_room").emit(event, data);
  }
};

module.exports = { initSocket, getIO, sendToUser, sendToStaff };
