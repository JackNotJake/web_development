// app.js — Express 应用装配
// 职责:中间件栈、健康检查、路由挂载、SPA 静态托管、错误处理。
// 入口 index.js 调用 createApp() 并附加 HTTP+Socket 服务器。

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { optionalAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.routes.js';
import matchRoutes from './routes/match.routes.js';
import predictionRoutes from './routes/prediction.routes.js';
import discussionRoutes from './routes/discussion.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 前端构建产物(生产单容器部署时由 app 直接托管)
const clientDist = path.resolve(__dirname, '../../client/dist');

/**
 * 创建并返回已装配好中间件与路由的 Express 应用。
 * 拆分为工厂以便测试与生产共用同一装配。
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  // —— 基础中间件 ——
  app.use(cors());
  app.use(express.json());
  // 软鉴权:公开浏览接口也能识别已登录用户(写操作由控制器兜底 401)
  app.use(optionalAuth);
  // 脱敏日志:仅记录方法/路径/状态/耗时,不含 token 与 body
  app.use(morgan(':method :url :status :response-time ms'));

  // —— 健康检查 ——
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // —— API 路由 ——
  app.use('/api/auth', authRoutes);
  app.use('/api/matches', matchRoutes);
  // 以下路由自带完整路径前缀(/matches/:matchId/predictions、/discussions/:id、/leaderboard)
  app.use('/api', predictionRoutes);
  app.use('/api', discussionRoutes);
  app.use('/api', leaderboardRoutes);

  // —— 静态资源 + SPA 回退(生产) ——
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    // 仅当存在前端构建产物时回退到 index.html;否则交给 404
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });

  // —— 404 ——
  app.use((req, res) => {
    res.status(404).json({ error: '资源不存在' });
  });

  // —— 统一错误处理 ——
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[unhandled]', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  });

  return app;
}

export default createApp;
