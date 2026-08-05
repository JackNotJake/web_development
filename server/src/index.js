// index.js — HTTP + Socket.io 服务器入口
// 启动流程:createApp → http.createServer → initSocket → listen → bootstrap(数据同步)
import http from 'http';
import { createApp } from './app.js';
import { initSocket } from './sockets/index.js';
import { createRealtimeService } from './services/realtimeService.js';
import { PORT } from './config.js';
import { syncOnce, startSyncJob } from './jobs/syncFootballData.js';

const app = createApp();
const server = http.createServer(app);

// 初始化 Socket.io 并挂载实时广播服务到 app.locals,供控制器按需使用
const io = initSocket(server);
app.locals.io = io;
app.locals.realtime = createRealtimeService(io);

/**
 * 引导数据同步:优先 keytar 钥匙串,其次环境变量。
 * 无 token 时跳过同步(应用仍可运行,使用本地已有/种子数据)。
 * keytar 通过动态导入隔离,避免原生模块异常影响主进程启动。
 */
async function bootstrap() {
  let token = process.env.FOOTBALL_DATA_TOKEN;
  try {
    const { getCredential } = await import('./services/credentialService.js');
    const stored = await getCredential('FOOTBALL_DATA_TOKEN');
    if (stored) token = stored;
  } catch (e) {
    console.warn('[bootstrap] keytar 不可用,跳过钥匙串读取:', e.message);
  }

  if (token) {
    // 启动时立即同步一次,随后每 10 分钟同步(免费层 10 次/分,留足余量)
    syncOnce('PL', token).catch((e) =>
      console.error('[bootstrap] 首次同步失败:', e.message)
    );
    startSyncJob(token, '*/10 * * * *');
    console.log('[bootstrap] Football-Data 同步已启动(每 10 分钟)');
  } else {
    console.warn(
      '[bootstrap] 未配置 FOOTBALL_DATA_TOKEN,跳过数据同步。可用 npm run key:set 录入,或使用种子数据 npm run db:seed。'
    );
  }
}

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  bootstrap();
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, closing...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
