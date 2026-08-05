// matchHandlers.js — match 房间事件处理
// Room 命名约定:match:${matchId}

/**
 * 为已连接的 socket 注册 match 相关事件处理器。
 * @param {import('socket.io').Server} io io 实例(保留以备后续广播/扩展使用)
 * @param {import('socket.io').Socket} socket 已鉴权的 socket
 */
export function matchHandlers(io, socket) {
  socket.on('match:join', ({ matchId }) => {
    socket.join(`match:${matchId}`);
  });

  socket.on('match:leave', ({ matchId }) => {
    socket.leave(`match:${matchId}`);
  });
}
