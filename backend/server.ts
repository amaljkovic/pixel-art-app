import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {origin: '*'}
});

const PORT = 8080;

interface PixelUpdate {
  x: number;
  y: number;
  color: string;
  pictureId: string;
  userId: string;
  username: string;
}

interface UserInfo {
  userId: string;
  username: string;
  pictureId: string;
}

const socketUserMap = new Map<string, { pictureId: string; userId: string }>()
const chatUsers = new Map<string, UserInfo>();

io.on('connection', (socket)=> {
    console.log(`client connected on ${socket.id}`);

    socket.on('joinChat', (data: UserInfo) => {
    socket.join(data.pictureId);
    chatUsers.set(socket.id, data);

    const usersInRoom = Array.from(chatUsers.values())
      .filter(u => u.pictureId === data.pictureId);
    
    io.to(data.pictureId).emit('chatUsers', usersInRoom);
  });

    socket.on('sendMessage', ({ pictureId, message, userId, username }) => {
    io.to(pictureId).emit('chatMessage', {
      message,
      userId,
      username,
      timestamp: new Date().toISOString()
    });
  });

    socket.on('enterDrawing', ({ pictureId, userId })=> {
        socket.join(pictureId);
        socketUserMap.set(socket.id, { pictureId, userId });
        console.log(`${socket.id} joined pic ${pictureId} (user ${userId})`);
    });

    socket.on('pixelUpdate', (payload: PixelUpdate)=> {
        
        socket.to(payload.pictureId).emit('pixelUpdate', payload);
    });

    socket.on('cursorMove', (payload) => {
    console.log('[recv] cursorMove', payload);
    socketUserMap.set(socket.id, { pictureId: payload.pictureId, userId: payload.userId });
    socket.to(payload.pictureId).emit('cursorMove', {
      x: payload.x,
      y: payload.y,
      userId: payload.userId,
      username: payload.username
    });
  });

  socket.on('leaveDrawing', ({ pictureId, userId }) => {
    socketUserMap.delete(socket.id);
    socket.to(pictureId).emit('userLeft', userId);
  });

  socket.on('disconnect', () => {
    const userInfo = socketUserMap.get(socket.id);
    if (userInfo) {
      console.log(`Client ${socket.id} disconnected, was user ${userInfo.userId}`);
      socket.to(userInfo.pictureId).emit('userLeft', userInfo.userId);
      socketUserMap.delete(socket.id);
    } else {
      console.log(`Client ${socket.id} disconnected`);
    }
    const user = chatUsers.get(socket.id);
    if (user) {
      chatUsers.delete(socket.id);
      const remainingUsers = Array.from(chatUsers.values())
        .filter(u => u.pictureId === user.pictureId);
      io.to(user.pictureId).emit('chatUsers', remainingUsers);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});