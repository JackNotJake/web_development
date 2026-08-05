import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinMatchRoom(matchId) {
  socket?.emit('match:join', { matchId });
}

export function leaveMatchRoom(matchId) {
  socket?.emit('match:leave', { matchId });
}
