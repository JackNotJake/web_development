// middleware/auth.js — JWT 验证中间件
// 解析 Authorization: Bearer <token>,校验通过后挂载 req.user = { userId, role, ... }

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config.js';

/**
 * JWT 验证中间件。
 * - 无 Authorization 头 / 非 Bearer → 401
 * - jwt.verify 失败(无效/过期)→ 401
 * - 成功 → req.user = decoded(含 userId),next()
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: '无效或过期的认证令牌' });
  }
}

/**
 * 软鉴权中间件:有合法 Bearer token 则挂载 req.user,无 token 或非法 token
 * 不拦截(交由控制器对写操作兜底 401)。用于浏览类公开接口同时识别已登录用户。
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice('Bearer '.length).trim(), getJwtSecret());
    } catch {
      // 非法 token:不报错,留给控制器按需处理
    }
  }
  return next();
}
