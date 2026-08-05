// sockets/index.js — Socket.io 初始化 + JWT 握手鉴权
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config.js';
import { matchHandlers } from './matchHandlers.js';

/**
 * 初始化 Socket.io 服务,挂载 JWT 握手鉴权中间件与连接处理器。
 * @param {import('http').Server} httpServer HTTP 服务器实例
 * @returns {import('socket.io').Server} io 实例
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // 握手鉴权:校验 handshake.auth.token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('no token'));
    }
    jwt.verify(token, getJwtSecret(), (err, decoded) => {
      if (err) {
        return next(new Error('invalid token'));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    matchHandlers(io, socket);
  });

  return io;
}
