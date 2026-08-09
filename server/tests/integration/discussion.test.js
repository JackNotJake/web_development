import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../src/prismaClient.js';
import discussionRoutes from '../../src/routes/discussion.routes.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/', discussionRoutes);

let userId, otherUserId, matchId, rootDiscussionId;

beforeAll(async () => {
  const u = await prisma.user.create({ data: { email: 'disc@example.com', passwordHash: 'x', username: 'discuser', role: 'USER' } });
  const u2 = await prisma.user.create({ data: { email: 'other@example.com', passwordHash: 'x', username: 'otheruser', role: 'USER' } });
  userId = u.id; otherUserId = u2.id;
  const home = await prisma.team.create({ data: { name: 'DHome', footballDataId: 5001 } });
  const away = await prisma.team.create({ data: { name: 'DAway', footballDataId: 5002 } });
  const m = await prisma.match.create({ data: { footballDataId: 8001, competition: 'PL', status: 'SCHEDULED', utcDate: new Date(), homeTeamId: home.id, awayTeamId: away.id } });
  matchId = m.id;
});
afterAll(async () => {
  await prisma.discussion.deleteMany({ where: { matchId } });
  await prisma.match.deleteMany({ where: { footballDataId: 8001 } });
  await prisma.team.deleteMany({ where: { footballDataId: { in: [5001, 5002] } } });
  await prisma.user.deleteMany({ where: { email: { in: ['disc@example.com', 'other@example.com'] } } });
  await prisma.$disconnect();
});

const token = (uid, role = 'USER') => jwt.sign({ userId: uid, role }, process.env.JWT_SECRET || 'test-secret');

describe('discussion routes', () => {
  it('创建评论 201', async () => {
    const res = await request(app).post(`/matches/${matchId}/discussions`).set('Authorization', `Bearer ${token(userId)}`).send({ content: '好球!' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('好球!');
    rootDiscussionId = res.body.id;
  });
  it('未登录创建 401', async () => {
    const res = await request(app).post(`/matches/${matchId}/discussions`).send({ content: 'x' });
    expect(res.status).toBe(401);
  });
  it('空内容 400', async () => {
    const res = await request(app).post(`/matches/${matchId}/discussions`).set('Authorization', `Bearer ${token(userId)}`).send({ content: '' });
    expect(res.status).toBe(400);
  });
  it('回复评论 201(一层)', async () => {
    const res = await request(app).post(`/matches/${matchId}/discussions`).set('Authorization', `Bearer ${token(userId)}`).send({ content: '回复', parentId: rootDiscussionId });
    expect(res.status).toBe(201);
    expect(res.body.parentId).toBe(rootDiscussionId);
  });
  it('GET 列表含 replies', async () => {
    const res = await request(app).get(`/matches/${matchId}/discussions`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.discussions)).toBe(true);
    const root = res.body.discussions.find(d => d.id === rootDiscussionId);
    expect(root).toBeTruthy();
    expect(root.replies.length).toBeGreaterThan(0);
  });
  it('本人 PATCH 200', async () => {
    const res = await request(app).patch(`/discussions/${rootDiscussionId}`).set('Authorization', `Bearer ${token(userId)}`).send({ content: '改后' });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('改后');
  });
  it('他人 PATCH 403', async () => {
    const res = await request(app).patch(`/discussions/${rootDiscussionId}`).set('Authorization', `Bearer ${token(otherUserId)}`).send({ content: 'hacked' });
    expect(res.status).toBe(403);
  });
  it('本人 DELETE 200', async () => {
    const res = await request(app).delete(`/discussions/${rootDiscussionId}`).set('Authorization', `Bearer ${token(userId)}`);
    expect(res.status).toBe(200);
  });
});
