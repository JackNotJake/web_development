import { describe, it, expect, vi } from 'vitest';
import { createRealtimeService } from '../../src/services/realtimeService.js';

function mockIo() {
  const rooms = new Set();
  return {
    to: vi.fn((room) => ({ emit: vi.fn((event, payload) => { rooms.add(room + ':' + event); }) })),
    emit: vi.fn(),
    _rooms: rooms,
  };
}

describe('realtimeService', () => {
  it('broadcastScore 向 match room 发 match:score', () => {
    const io = mockIo();
    const rt = createRealtimeService(io);
    rt.broadcastScore('match123', { homeScore: 1, awayScore: 0 });
    expect(io.to).toHaveBeenCalledWith('match:match123');
  });
  it('broadcastDiscussion 向 match room 发对应事件', () => {
    const io = mockIo();
    const rt = createRealtimeService(io);
    rt.broadcastDiscussion('m1', 'discussion:new', { id: 'd1' });
    expect(io.to).toHaveBeenCalledWith('match:m1');
  });
  it('broadcastLeaderboard 全站广播', () => {
    const io = mockIo();
    const rt = createRealtimeService(io);
    rt.broadcastLeaderboard({ top: [] });
    expect(io.emit).toHaveBeenCalledWith('leaderboard:update', { top: [] });
  });
  it('createRealtimeService 返回所有广播方法', () => {
    const rt = createRealtimeService(mockIo());
    expect(typeof rt.broadcastScore).toBe('function');
    expect(typeof rt.broadcastDiscussion).toBe('function');
    expect(typeof rt.broadcastLeaderboard).toBe('function');
  });
});
