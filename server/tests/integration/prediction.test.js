import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../src/prismaClient.js';
import predictionRoutes from '../../src/routes/prediction.routes.js';
import leaderboardRoutes from '../../src/routes/leaderboard.routes.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) { try { req.user = jwt.verify(auth.slice(7), 'test-secret'); } catch { return res.status(401).json({ error: 'invalid' }); } }
  next();
});
app.use('/', predictionRoutes);
app.use('/', leaderboardRoutes);

let userId, matchId, finishedMatchId, homeId, awayId;
const token = (uid, role = 'USER') => jwt.sign({ userId: uid, role }, 'test-secret');

beforeAll(async () => {
  const u = await prisma.user.create({ data: { email: 'pred@example.com', passwordHash: 'x', username: 'preduser', totalPoints: 100, role: 'USER' } });
  userId = u.id;
  const home = await prisma.team.create({ data: { name: 'PredHome', footballDataId: 6001, eloRating: 1600 } });
  const away = await prisma.team.create({ data: { name: 'PredAway', footballDataId: 6002, eloRating: 1400 } });
  homeId = home.id; awayId = away.id;
  const m = await prisma.match.create({ data: { footballDataId: 7001, competition: 'PL', status: 'SCHEDULED', utcDate: new Date('2026-08-10'), homeTeamId: home.id, awayTeamId: away.id } });
  matchId = m.id;
  const fm = await prisma.match.create({ data: { footballDataId: 7002, competition: 'PL', status: 'FINISHED', utcDate: new Date(), homeTeamId: home.id, awayTeamId: away.id, homeScore: 2, awayScore: 1 } });
  finishedMatchId = fm.id;
});
afterAll(async () => {
  await prisma.prediction.deleteMany({ where: { userId } });
  await prisma.match.deleteMany({ where: { footballDataId: { in: [7001, 7002] } } });
  await prisma.team.deleteMany({ where: { footballDataId: { in: [6001, 6002] } } });
  await prisma.user.deleteMany({ where: { email: 'pred@example.com' } });
  await prisma.$disconnect();
});

describe('prediction routes', () => {
  it('提交预测 201', async () => {
    const res = await request(app).post(`/matches/${matchId}/predictions`).set('Authorization', `Bearer ${token(userId)}`).send({ homeScore: 2, awayScore: 1 });
    expect(res.status).toBe(201);
    expect(res.body.prediction.homeScore).toBe(2);
  });
  it('未登录 401', async () => {
    const res = await request(app).post(`/matches/${matchId}/predictions`).send({ homeScore: 1, awayScore: 0 });
    expect(res.status).toBe(401);
  });
  it('重复提交即更新', async () => {
    const res = await request(app).post(`/matches/${matchId}/predictions`).set('Authorization', `Bearer ${token(userId)}`).send({ homeScore: 3, awayScore: 0 });
    expect(res.status).toBe(201);
    expect(res.body.prediction.homeScore).toBe(3);
    // 仍只有一条
    const cnt = await prisma.prediction.count({ where: { userId, matchId } });
    expect(cnt).toBe(1);
  });
  it('已结束比赛提交 409', async () => {
    const res = await request(app).post(`/matches/${finishedMatchId}/predictions`).set('Authorization', `Bearer ${token(userId)}`).send({ homeScore: 1, awayScore: 1 });
    expect(res.status).toBe(409);
  });
  it('GET forecast 返回 mostLikely + matrix', async () => {
    const res = await request(app).get(`/matches/${matchId}/forecast`);
    expect(res.status).toBe(200);
    expect(res.body.mostLikely).toHaveLength(2);
    expect(res.body.matrix.length).toBe(11);
  });
  it('GET prediction-final 返回 final3', async () => {
    const res = await request(app).get(`/matches/${matchId}/prediction-final`);
    expect(res.status).toBe(200);
    expect(res.body.final3).toHaveLength(3);
  });
  it('GET leaderboard 降序', async () => {
    const res = await request(app).get('/leaderboard?scope=all');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });
});
