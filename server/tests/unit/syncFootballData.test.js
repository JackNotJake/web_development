import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock footballDataApi
const fakeMatches = {
  matches: [
    { id: 11, status: 'SCHEDULED', utcDate: '2026-08-10T15:00:00Z', matchday: 1,
      homeTeam: { id: 21, name: 'HomeU', shortName: 'HU', crest: 'http://h.png' },
      awayTeam: { id: 22, name: 'AwayU', shortName: 'AU', crest: 'http://a.png' },
      score: { fullTime: { home: null, away: null } } },
  ],
};
vi.mock('../../src/lib/footballDataApi.js', () => ({
  fetchMatches: vi.fn(async () => fakeMatches),
  clearCache: vi.fn(),
}));

import { syncOnce } from '../../src/jobs/syncFootballData.js';
import { prisma } from '../../src/prismaClient.js';

describe('syncFootballData', () => {
  beforeEach(async () => {
    // 清理可能的残留
    await prisma.match.deleteMany({ where: { footballDataId: 11 } });
    await prisma.team.deleteMany({ where: { footballDataId: { in: [21, 22] } } });
  });

  it('syncOnce 同步一场比赛与两队', async () => {
    const result = await syncOnce('PL', 'fake-token');
    expect(result.matchesSynced).toBe(1);
    const m = await prisma.match.findUnique({ where: { footballDataId: 11 } });
    expect(m).toBeTruthy();
    expect(m.competition).toBe('PL');
    const teams = await prisma.team.findMany({ where: { footballDataId: { in: [21, 22] } } });
    expect(teams).toHaveLength(2);
  });

  it('syncOnce 幂等(重复同步不重复创建)', async () => {
    await syncOnce('PL', 'fake-token');
    await syncOnce('PL', 'fake-token');
    const cnt = await prisma.match.count({ where: { footballDataId: 11 } });
    expect(cnt).toBe(1);
    const teamCnt = await prisma.team.count({ where: { footballDataId: { in: [21, 22] } } });
    expect(teamCnt).toBe(2);
  });

  it('syncOnce 失败不抛(返回错误信息)', async () => {
    const { fetchMatches } = await import('../../src/lib/footballDataApi.js');
    fetchMatches.mockRejectedValueOnce(new Error('network down'));
    const result = await syncOnce('PL', 'fake-token');
    expect(result.error).toBeTruthy();
  });
});
