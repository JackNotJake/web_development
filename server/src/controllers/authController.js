// authController.js — 注册 / 登录控制器
// 注册:zod 校验 → 查重 → bcrypt 哈希 → 入库 → 签发 JWT
// 登录:查用户 → bcrypt 比对 → 签发 JWT

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prismaClient.js';
import { getJwtSecret } from '../config.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * 签发 JWT(payload { userId, role },有效期 2h)。
 * @param {{ id: string, role: string }} user
 * @returns {string} token
 */
function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: '2h' }
  );
}

/**
 * 去除 passwordHash,返回对外安全的用户视图。
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    eloScore: user.eloScore,
    totalPoints: user.totalPoints,
    role: user.role,
  };
}

/**
 * POST /auth/register
 */
export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: '请求参数无效', details: parsed.error.issues });
  }
  const { email, password, username } = parsed.data;

  // 查重:email 或 username 已存在 → 409
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });
  if (existing) {
    return res.status(409).json({ error: '邮箱或用户名已被注册' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, username },
  });

  const token = signToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
}

/**
 * POST /auth/login
 */
export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = signToken(user);
  return res.status(200).json({ token, user: sanitizeUser(user) });
}
