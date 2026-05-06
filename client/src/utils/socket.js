import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.MODE === 'production' 
  ? 'https://credify-awqh.vercel.app/' // Thay đổi bằng URL production thực tế của bạn
  : 'http://localhost:5001';

let socket;

export const initSocket = (user) => {
  if (!user) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socket.on("connect", () => {
    console.log("Connected to WebSocket server");
    
    // Gửi userId để tham gia room riêng
    socket.emit("join", user.id);

    // Nếu là Staff, tham gia staff_room
    if (user.role === 'staff' || user.role === 'admin_system') {
      socket.emit("join_staff");
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server");
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
