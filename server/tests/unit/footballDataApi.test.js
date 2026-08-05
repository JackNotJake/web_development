import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockData = { matches: [{ id: 1, homeTeam: { name: 'A' } }, { id: 2 }] };
let callCount = 0;
vi.mock('axios', () => ({
  default: {
    get: vi.fn(async (url, cfg) => { callCount++; return { data: mockData }; }),
  },
}));

import { fetchMatches, clearCache } from '../../src/lib/footballDataApi.js';

describe('footballDataApi', () => {
  beforeEach(() => { clearCache(); callCount = 0; vi.clearAllMocks(); });

  it('fetchMatches 返回 matches 数组', async () => {
    const r = await fetchMatches('PL', 'token-xyz');
    expect(r.matches).toHaveLength(2);
    expect(r.matches[0].id).toBe(1);
  });
  it('请求带 X-Auth-Token header', async () => {
    const axios = (await import('axios')).default;
    await fetchMatches('PL', 'my-token');
    expect(axios.get).toHaveBeenCalled();
    const callArgs = axios.get.mock.calls[0];
    const cfg = callArgs[1];
    expect(cfg.headers['X-Auth-Token']).toBe('my-token');
  });
  it('URL 含 competition', async () => {
    const axios = (await import('axios')).default;
    await fetchMatches('PL', 't');
    const url = axios.get.mock.calls[0][0];
    expect(url).toContain('/competitions/PL/matches');
    expect(url).toContain('api.football-data.org');
  });
  it('同参数第二次走缓存(不重复请求)', async () => {
    await fetchMatches('PL', 't');
    expect(callCount).toBe(1);
    await fetchMatches('PL', 't');
    expect(callCount).toBe(1); // 仍是1,走缓存
  });
  it('不同参数不命中缓存', async () => {
    await fetchMatches('PL', 't');
    await fetchMatches('SA', 't');
    expect(callCount).toBe(2);
  });
  it('clearCache 后重新请求', async () => {
    await fetchMatches('PL', 't');
    clearCache();
    await fetchMatches('PL', 't');
    expect(callCount).toBe(2);
  });
});
