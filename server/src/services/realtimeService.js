// realtimeService.js — 实时广播封装
// 接收一个 io 实例,提供面向 match room 与全站的广播方法。
// Room 命名约定:match:${matchId}

/**
 * 创建实时广播服务。
 * @param {import('socket.io').Server} io Socket.io Server 实例
 * @returns {{ broadcastScore: Function, broadcastDiscussion: Function, broadcastLeaderboard: Function }}
 */
export function createRealtimeService(io) {
  return {
    /**
     * 向指定比赛房间广播比分更新。
     * @param {string} matchId 比赛 ID
     * @param {*} payload 比分载荷
     */
    broadcastScore(matchId, payload) {
      io.to(`match:${matchId}`).emit('match:score', payload);
    },

    /**
     * 向指定比赛房间广播讨论事件(事件名由调用方决定)。
     * @param {string} matchId 比赛 ID
     * @param {string} event 事件名(如 'discussion:new')
     * @param {*} payload 事件载荷
     */
    broadcastDiscussion(matchId, event, payload) {
      io.to(`match:${matchId}`).emit(event, payload);
    },

    /**
     * 全站广播排行榜更新。
     * @param {*} payload 排行榜载荷
     */
    broadcastLeaderboard(payload) {
      io.emit('leaderboard:update', payload);
    },
  };
}
