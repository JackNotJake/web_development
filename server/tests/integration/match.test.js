import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../src/prismaClient.js';
import matchRoutes from '../../src/routes/match.routes.js';

const app = express();
app.use(express.json());
app.use('/matches', matchRoutes);

let testMatchId;

beforeAll(async () => {
  // 建测试数据:两个队 + 一场比赛
  const home = await prisma.team.create({ data: { name: 'Home FC', footballDataId: 1001, eloRating: 1500 } });
  const away = await prisma.team.create({ data: { name: 'Away FC', footballDataId: 1002, eloRating: 1480 } });
  const m = await prisma.match.create({
    data: { footballDataId: 9001, competition: 'PL', matchday: 1, status: 'SCHEDULED', utcDate: new Date('2026-08-10'), homeTeamId: home.id, awayTeamId: away.id },
  });
  testMatchId = m.id;
});
afterAll(async () => {
  await prisma.match.deleteMany({ where: { footballDataId: 9001 } });
  await prisma.team.deleteMany({ where: { footballDataId: { in: [1001, 1002] } } });
  await prisma.$disconnect();
});

describe('match routes', () => {
  it('GET /matches 返回列表+分页', async () => {
    const res = await request(app).get('/matches');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.page).toBe(1);
    expect(res.body.total).toBeGreaterThan(0);
  });
  it('GET /matches?competition=PL 过滤', async () => {
    const res = await request(app).get('/matches?competition=PL');
    expect(res.status).toBe(200);
    expect(res.body.matches.every(m => m.competition === 'PL')).toBe(true);
  });
  it('GET /matches/:id 详情含双方 Team Elo', async () => {
    const res = await request(app).get(`/matches/${testMatchId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testMatchId);
    expect(res.body.homeTeam).toBeTruthy();
    expect(res.body.awayTeam).toBeTruthy();
    expect(res.body.homeTeam.eloRating).toBe(1500);
  });
  it('GET /matches/:id 不存在返回 404', async () => {
    const res = await request(app).get('/matches/nonexistent');
    expect(res.status).toBe(404);
  });
});
