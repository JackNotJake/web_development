import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../src/prismaClient.js';
import authRoutes from '../../src/routes/auth.routes.js';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const TEST_EMAIL = 'test@example.com';
const TEST_USER = 'testuser';

describe('auth integration', () => {
  beforeAll(async () => {
    // 清理可能残留的测试用户
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  describe('POST /auth/register', () => {
    it('注册成功返回 201 + token + user(无 passwordHash)', async () => {
      const res = await request(app).post('/auth/register').send({ email: TEST_EMAIL, password: 'password123', username: TEST_USER });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.email).toBe(TEST_EMAIL);
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });
    it('重复注册 409', async () => {
      const res = await request(app).post('/auth/register').send({ email: TEST_EMAIL, password: 'password123', username: 'other' });
      expect(res.status).toBe(409);
    });
    it('字段缺失 400', async () => {
      const res = await request(app).post('/auth/register').send({ email: TEST_EMAIL });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('登录成功返回 token', async () => {
      const res = await request(app).post('/auth/login').send({ email: TEST_EMAIL, password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });
    it('错误密码 401', async () => {
      const res = await request(app).post('/auth/login').send({ email: TEST_EMAIL, password: 'wrong' });
      expect(res.status).toBe(401);
    });
    it('不存在用户 401', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'nope@nope.com', password: 'x' });
      expect(res.status).toBe(401);
    });
  });
});
