# 足球赛事 Web 应用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个"赛事浏览+比分预测+赛后讨论"全栈 Web 应用,含可解释 Elo+Poisson 预测、Socket 实时、JWT 鉴权、Docker 分发、GitLab CI、云部署。

**Architecture:** React SPA + Node/Express + Prisma + Socket.io;Football-Data.org 经 node-cron 服务端同步缓存;预测=Elo+Poisson 与用户投票加权融合。

**Tech Stack:** React18+Vite+Tailwind, Node+Express+Prisma(SQLite/Postgres), Socket.io, JWT+bcrypt, keytar, Vitest+Supertest, Docker, GitLab CI.

> 验证命令:`npm test`(根,跑全部)。CI `unit-test` job 即此命令。
> TDD 纪律:每个实现 task 先写失败测试→确认红→最少实现→确认绿→commit。
> 完成一个 task 即在 PLAN.md 勾选并附 commit hash。

---

## 文件结构(File Structure)

```
web开发trae/
├── package.json                 # workspaces 根,scripts: test/dev/build/key:*
├── .gitlab-ci.yml               # unit-test job
├── Dockerfile  docker-compose.yml
├── .gitignore                   # 排除 .env dev.db *.key node_modules .design
├── server/
│   ├── package.json
│   ├── src/index.js             # HTTP+Socket 共用 server
│   ├── src/app.js               # Express 组装+中间件
│   ├── src/config.js            # 配置加载(keytar→env→默认)
│   ├── src/routes/{auth,match,prediction,discussion,leaderboard,health}.routes.js
│   ├── src/controllers/*.js
│   ├── src/services/{elo,poisson,prediction,discussion,match,realtime,credential}Service.js
│   ├── src/middleware/{auth,errorHandler}.js
│   ├── src/sockets/{index,matchHandlers,discussionHandlers}.js
│   ├── src/jobs/syncFootballData.js
│   ├── src/lib/footballDataApi.js
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── tests/unit/{elo,poisson,prediction,credential}.test.js
│       tests/integration/{auth,match,prediction,discussion,socket}.test.js
└── client/
    ├── package.json  vite.config.js  tailwind.config.js
    ├── index.html
    └── src/{main,App}.jsx, routes/, components/, hooks/, stores/, services/, lib/
```

依赖关系图(数字为 task 编号;→ 依赖,∥ 可并行):
```
T1(脚手架) → T2(schema) → { T3 elo ∥ T4 poisson } → T5(prediction融合) → T6(结算)
T1 → T7(credential) → T8(footballData适配) → T9(cron同步)
T2 → T10(auth) → T11(match路由) → T12(discussion CRUD)
T1 → T13(socket) ; T6+T12+T13 → T14(集成测试)
T1 → T15(前端脚手架) → T16(前端页面) → T17(对接)
T8 → T18(Docker) ; T1 → T19(CI) ; T17 → T20(部署)
```

---

## Phase A — 后端核心(TDD)

### Task 1: 项目脚手架与 workspaces

**Files:** Create `package.json`, `server/package.json`, `client/package.json`, `.gitignore`, `server/vitest.config.js`

- [ ] **Step 1: 初始化根 workspaces**
  `package.json`:`"workspaces": ["server","client"]`, scripts:`"test":"npm test --workspaces --if-present"`,`"dev":"concurrently \"npm:dev:server\" \"npm:dev:client\""`.
- [ ] **Step 2: server 依赖** express, prisma, @prisma/client, socket.io, jsonwebtoken, bcryptjs, node-cron, keytar, axios, zod, cors, morgan. dev: vitest, supertest, @types/node.
- [ ] **Step 3: vitest 配置** `server/vitest.config.js`:`environment:'node'`,`coverage`可选.
- [ ] **Step 4: .gitignore** 排除 `node_modules`、`.env`、`dev.db`、`*.key`、`.design/`、`dist/`.
- [ ] **Step 5: 验证** `npm install` 成功;`npm test` 退出码 0(无测试时).
- [ ] **Step 6: Commit** `chore: scaffold workspaces`.

**验证**:`npm install` 与 `npm test` 不报错。

---

### Task 2: Prisma Schema 与迁移

**Files:** Create `server/prisma/schema.prisma`, `server/src/prismaClient.js`, Modify `server/package.json`(prisma script)

- [ ] **Step 1: 写 schema**(见 SPEC §6 数据模型,User/Team/Match/Prediction/Discussion,含唯一约束 `@@unique([userId, matchId])` on Prediction).
- [ ] **Step 2: 写失败测试** `tests/unit/prismaClient.test.js`:断言 `prisma.user`/`prisma.match` 等 model 存在.
- [ ] **Step 3: 跑测试确认红** `npx prisma generate` 后 `npm test -- prismaClient` → 应先失败.
- [ ] **Step 4: 实现** `src/prismaClient.js`:`export const prisma = new PrismaClient()`.
- [ ] **Step 5: 跑测试确认绿**.
- [ ] **Step 6: 迁移** `npx prisma migrate dev --name init`(SQLite dev).
- [ ] **Step 7: Commit** `feat: prisma schema and models`.

**验证**:`npx prisma migrate dev` 生成迁移;`prisma.user` 可访问.

依赖:T1.

---

### Task 3: Elo 评级服务(纯函数,核心深度)

**Files:** Create `server/src/services/eloService.js`, Test `server/tests/unit/eloService.test.js`

- [ ] **Step 1: 写失败测试**(完整代码):
```javascript
import { describe, it, expect } from 'vitest';
import { expectedScore, updateElo } from '../../src/services/eloService.js';

describe('eloService', () => {
  it('expectedScore: 同分时预期胜率为0.5', () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
  });
  it('expectedScore: 高分队伍预期胜率更高', () => {
    const we = expectedScore(1600, 1500);
    expect(we).toBeGreaterThan(0.5);
    expect(we).toBeCloseTo(0.6401, 3); // 1/(1+10^(-100/400))
  });
  it('updateElo: 胜方加分、负方减分', () => {
    const [ra, rb] = updateElo(1500, 1500, 1, 32); // home wins, S=1
    expect(ra).toBeGreaterThan(1500);
    expect(rb).toBeLessThan(1500);
    expect(ra + rb).toBeCloseTo(3000, 5); // 零和
  });
  it('updateElo: 平局双方趋近平均', () => {
    const [ra, rb] = updateElo(1600, 1400, 0.5, 32);
    expect(ra).toBeLessThan(1600);
    expect(rb).toBeGreaterThan(1400);
  });
});
```
- [ ] **Step 2: 跑确认红** `npx vitest run tests/unit/eloService.test.js` → FAIL "module not found".
- [ ] **Step 3: 实现**:
```javascript
// eloService.js
export const K = 32;
export function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}
// result: 主队视角实际得分 1=胜 0.5=平 0=负
export function updateElo(ra, rb, result, k = K) {
  const we = expectedScore(ra, rb);
  const newRa = ra + k * (result - we);
  const newRb = rb + k * ((1 - result) - (1 - we));
  return [Math.round(newRa), Math.round(newRb)];
}
```
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: elo rating service with tests`.

**验证**:4 个测试全绿;零和性成立。

依赖:T2. ∥ T4.

---

### Task 4: Poisson 概率矩阵服务(核心深度)

**Files:** Create `server/src/services/poissonService.js`, Test `server/tests/unit/poissonService.test.js`

- [ ] **Step 1: 写失败测试**:
```javascript
import { describe, it, expect } from 'vitest';
import { poissonPmf, scoreMatrix, mostLikelyScore } from '../../src/services/poissonService.js';

describe('poissonService', () => {
  it('poissonPmf: λ=1.5 时 P(0)=e^-1.5', () => {
    expect(poissonPmf(0, 1.5)).toBeCloseTo(Math.exp(-1.5), 6);
    expect(poissonPmf(1, 1.5)).toBeCloseTo(1.5 * Math.exp(-1.5), 6);
  });
  it('poissonPmf: 概率和≈1(0..10)', () => {
    const sum = Array.from({length:11}, (_,k)=>poissonPmf(k,2.0)).reduce((a,b)=>a+b,0);
    expect(sum).toBeCloseTo(1, 3);
  });
  it('scoreMatrix: 形状 11x11 且概率和≈1', () => {
    const m = scoreMatrix(1.5, 1.2);
    expect(m.length).toBe(11);
    expect(m[0].length).toBe(11);
    let sum = 0; for (const r of m) for (const v of r) sum += v;
    expect(sum).toBeCloseTo(1, 2);
  });
  it('mostLikelyScore: λ主>λ客 时主队更可能赢', () => {
    const m = scoreMatrix(2.5, 0.8);
    const [h, a] = mostLikelyScore(m);
    expect(h).toBeGreaterThan(a);
  });
});
```
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:
```javascript
const MAX_GOALS = 10;
export function poissonPmf(k, lambda) {
  if (k < 0 || lambda <= 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}
function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }
export function scoreMatrix(lambdaHome, lambdaAway) {
  const m = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    const row = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      row.push(poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway));
    }
    m.push(row);
  }
  return m;
}
export function mostLikelyScore(matrix) {
  let best = [0, 0], bestP = -1;
  for (let h = 0; h < matrix.length; h++)
    for (let a = 0; a < matrix[h].length; a++)
      if (matrix[h][a] > bestP) { bestP = matrix[h][a]; best = [h, a]; }
  return best;
}
```
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: poisson probability matrix service`.

**验证**:4 测试绿;概率和≈1。

依赖:T2. ∥ T3.

---

### Task 5: 预测融合服务(算法+社区融合)

**Files:** Create `server/src/services/predictionService.js`, Test `server/tests/unit/predictionService.test.js`

- [ ] **Step 1: 写失败测试**(融合权重、Dirichlet 平滑、最可能比分):
```javascript
import { describe, it, expect } from 'vitest';
import { fuseDistributions, communityDistribution, computeLambdas, forecast } from '../../src/services/predictionService.js';

describe('predictionService', () => {
  it('computeLambdas: 主队Elo高则λ主>λ客', () => {
    const [lh, la] = computeLambdas(1600, 1400, 2.6, 0.2);
    expect(lh).toBeGreaterThan(la);
  });
  it('communityDistribution: 空投票经Dirichlet平滑后非零且和≈1', () => {
    const dist = communityDistribution([], 11);
    expect(dist.length).toBe(11);
    const sum = dist.reduce((a,b)=>a+b,0);
    expect(sum).toBeCloseTo(1, 3);
  });
  it('fuseDistributions: w=1 时等于算法分布', () => {
    const algo = Array(11).fill(0).map((_,i)=>i===0?0.5:0.05);
    const comm = Array(11).fill(1/11);
    const f = fuseDistributions(algo, comm, 1.0);
    expect(f[0]).toBeCloseTo(0.5, 6);
  });
  it('forecast: 返回最可能比分与概率', () => {
    const r = forecast({ homeElo:1600, awayElo:1400, baseGoals:2.6, homeAdv:0.2, votes:[] });
    expect(r.mostLikely).toHaveLength(2);
    expect(r.probability).toBeGreaterThan(0);
    expect(r.matrix.length).toBe(11);
  });
});
```
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:含 `computeLambdas`(主客调整)、`communityDistribution`(Dirichlet α=1 平滑到 11x11 矩阵展平或简化为胜平负三档)、`fuseDistributions(w·algo+(1-w)·comm)`、`forecast`(组装 Elo→λ→矩阵→融合→mostLikely;w 随 votes 数从 0.7 下调到 0.5).
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: prediction fusion service`.

**验证**:4 测试绿。

依赖:T3, T4.

---

### Task 6: 预测结算与积分

**Files:** Create `server/src/services/settlementService.js`(或并入 predictionService), Test `server/tests/unit/settlementService.test.js`

- [ ] **Step 1: 写失败测试**:
```javascript
import { describe, it, expect } from 'vitest';
import { scorePrediction } from '../../src/services/settlementService.js';
describe('settlementService', () => {
  it('完全命中 +3', () => { expect(scorePrediction(2,1, 2,1)).toBe(3); });
  it('分差±1 +1', () => { expect(scorePrediction(2,1, 2,0)).toBe(1); expect(scorePrediction(1,0,2,1)).toBe(1); });
  it('其他 0', () => { expect(scorePrediction(3,0, 0,0)).toBe(0); });
});
```
- [ ] **Step 2-4: 实现+确认绿**:`scorePrediction(home, away, predHome, predAway)`.
- [ ] **Step 5: 集成**:比赛 FINISHED 时,遍历该 match 的 Prediction,算 points,更新 User.totalPoints/eloScore.
- [ ] **Step 6: Commit** `feat: settlement scoring`.

**验证**:积分规则正确。

依赖:T5.

---

### Task 7: 凭据安全服务(keytar)

**Files:** Create `server/src/services/credentialService.js`, `server/src/config.js`, Test `server/tests/unit/credentialService.test.js`

- [ ] **Step 1: 写失败测试**(mock keytar):
```javascript
import { describe, it, expect, vi } from 'vitest';
vi.mock('keytar', () => ({
  setPassword: vi.fn(),
  getPassword: vi.fn(async (s,a) => a==='FOOTBALL_DATA_TOKEN' ? 'secret' : null),
  deletePassword: vi.fn(),
}));
import { setCredential, getCredential, hasCredential, clearCredential, maskStatus } from '../../src/services/credentialService.js';
describe('credentialService', () => {
  it('getCredential 返回明文', async () => {
    expect(await getCredential('FOOTBALL_DATA_TOKEN')).toBe('secret');
  });
  it('hasCredential 正确', async () => {
    expect(await hasCredential('FOOTBALL_DATA_TOKEN')).toBe(true);
    expect(await hasCredential('MISSING')).toBe(false);
  });
  it('maskStatus 不回显明文', async () => {
    const s = await maskStatus(['FOOTBALL_DATA_TOKEN','MISSING']);
    expect(s).toContain('set ✓'); expect(s).not.toContain('secret');
  });
});
```
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现** `credentialService.js`:`setCredential(name,val)=keytar.setPassword(SERVICE,name,val)`;`getCredential= keytar.getPassword`;`hasCredential = (await get)!==null`;`clearCredential= keytar.deletePassword`;`maskStatus(names)='NAME: set ✓ / unset ✗'` 不回显明文.
- [ ] **Step 4: config.js**:`loadConfig()` 优先 keytar,回退 process.env,再回退默认;`JWT_SECRET`、`FOOTBALL_DATA_TOKEN`、`DATABASE_URL`.
- [ ] **Step 5: 跑确认绿**.
- [ ] **Step 6: CLI 脚本** `server/src/cli/keys.js`:`set/status/clear` 子命令,隐藏输入(readline muted).
- [ ] **Step 7: package.json scripts** `key:set/status/clear`.
- [ ] **Step 8: Commit** `feat: credential security via keytar`.

**验证**:测试绿;`key:status` 不回显明文;`.env` 在 .gitignore.

依赖:T1.

---

### Task 8: Football-Data 适配层(含缓存)

**Files:** Create `server/src/lib/footballDataApi.js`, Test `server/tests/unit/footballDataApi.test.js`

- [ ] **Step 1: 写失败测试**(mock axios,验证带 token header 与缓存):
```javascript
import { describe, it, expect, vi } from 'vitest';
vi.mock('axios', () => ({ default: { get: vi.fn(async (url, cfg) => ({ data: { matches: [{ id: 1 }] }, cfg })) }) }));
import { fetchMatches, clearCache } from '../../src/lib/footballDataApi.js';
describe('footballDataApi', () => {
  it('fetchMatches 带 X-Auth-Token header', async () => {
    clearCache(); const r = await fetchMatches('PL', 'token-xyz');
    expect(r.matches).toHaveLength(1);
  });
  it('同参数第二次走缓存(不重复请求)', async () => {
    clearCache(); await fetchMatches('PL','t'); const axios = (await import('axios')).default;
    const calls = axios.get.mock.calls.length;
    await fetchMatches('PL','t'); expect(axios.get.mock.calls.length).toBe(calls);
  });
});
```
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:`BASE=https://api.football-data.org/v4`;`fetchMatches(competition, token, {dateFrom,dateTo})` → `GET /competitions/{id}/matches`;内存缓存(Map,key=competition+dateRange,TTL=60s);`clearCache()`. 统一错误包装(429 限流提示).
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: football-data adapter with cache`.

**验证**:2 测试绿;缓存命中不重复请求.

依赖:T7(取 token).

---

### Task 9: 定时同步任务(node-cron)

**Files:** Create `server/src/jobs/syncFootballData.js`, Test `server/tests/unit/syncFootballData.test.js`

- [ ] **Goal**:cron 每 1 分钟(可配)拉取英超赛程 upsert 到 DB;失败记日志不崩溃.
- [ ] **Step 1: 写失败测试**(mock adapter + prisma,断言 upsert 被调用、限流计数).
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:`syncOnce()` → fetchMatches → 遍历 matches → `prisma.match.upsert({where:{footballDataId}, create, update})`;同步 Team(无则建,更新 Elo 用默认1500). `startSyncJob()` = `node-cron.schedule('* * * * *', syncOnce)`.
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: scheduled football data sync`.

**验证**:测试绿;upsert 正确.

依赖:T8, T2.

---

### Task 10: 鉴权模块(Auth + JWT 中间件)

**Files:** Create `server/src/routes/auth.routes.js`, `server/src/middleware/auth.js`, `server/src/controllers/authController.js`, Test `server/tests/integration/auth.test.js`

- [ ] **Step 1: 写失败测试**(Supertest):注册201、重复409、登录200拿token、受保护端点无token401/伪造401.
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:`POST /auth/register`(bcrypt 哈希)、`POST /auth/login`(比对、签 JWT 2h)、`auth` 中间件读 `Authorization: Bearer`、`jwt.verify`.
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: auth module with jwt`.

**验证**:5 测试绿.

依赖:T2, T7(JWT secret).

---

### Task 11: 赛事路由(Matches)

**Files:** Create `server/src/routes/match.routes.js`, `server/src/controllers/matchController.js`, Test `server/tests/integration/match.test.js`

- [ ] **Step 1: 写失败测试**:`GET /matches` 列表+分页;`GET /matches/:id` 详情含双方 Elo;DB 空 503(或空数组+提示).
- [ ] **Step 2-3: 实现**:从 DB 读,支持 competition/status/dateFrom-dateTo 过滤、page/limit.
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: match routes`.

依赖:T2, T10(可选鉴权).

---

### Task 12: 讨论模块(Discussion CRUD)

**Files:** Create `server/src/routes/discussion.routes.js`, `server/src/controllers/discussionController.js`, `server/src/services/discussionService.js`, Test `server/tests/integration/discussion.test.js`

- [ ] **Step 1: 写失败测试**:POST 创建201、GET 按 matchId 分页树形、PATCH 仅本人200/他人403、DELETE 本人或admin、空内容400、一层回复(parentId 校验).
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:zod 校验 content 1-500;parentId 须同 matchId 且为根评论.
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: discussion crud`.

**验证**:7 测试绿.

依赖:T2, T10.

---

### Task 13: 预测路由 + 排行榜路由

**Files:** Create `server/src/routes/{prediction,leaderboard}.routes.js`, controllers, Test `server/tests/integration/{prediction,leaderboard}.test.js`

- [ ] **Step 1: 写失败测试**:POST 预测(未开始可提交/已开始409/重复更新/非负整数校验);`GET /matches/:id/forecast` 返回矩阵+mostLikely+probability;`GET /matches/:id/community`;`GET /matches/:id/prediction-final` 融合;`GET /leaderboard?scope=week|all` 降序+当前用户排名.
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:接 predictionService.forecast;唯一约束 upsert;(userId,matchId) 唯一 → 重复提交即更新.
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: prediction and leaderboard routes`.

依赖:T5, T6, T10, T11.

---

### Task 14: Socket.io 实时

**Files:** Create `server/src/sockets/{index,matchHandlers,discussionHandlers}.js`, `server/src/services/realtimeService.js`, Test `server/tests/integration/socket.test.js`

- [ ] **Step 1: 写失败测试**:用 socket.io-client 测试客户端 — `io.use` JWT 握手(合法连/非法拒连 connect_error);`match:join` 加入 room;广播 `match:score` 仅同 room 收到;`discussion:new` 推送.
- [ ] **Step 2: 跑确认红**.
- [ ] **Step 3: 实现**:`initSocket(server)` → `io.use(jwt verify)`;`match:join` → `socket.join('match:'+id)`;realtimeService 暴露 `broadcastScore(matchId,payload)`=`io.to(room).emit('match:score',payload)`;discussion 增删改后调对应广播.
- [ ] **Step 4: 跑确认绿**.
- [ ] **Step 5: Commit** `feat: realtime socket.io with jwt rooms`.

**验证**:4 测试绿.

依赖:T6, T12, T13.

---

### Task 15: 后端 app 组装 + health + error handler

**Files:** Create `server/src/app.js`, `server/src/index.js`, `server/src/middleware/errorHandler.js`, `server/src/routes/health.routes.js`

- [ ] **Goal**:组装 Express(cors 白名单、morgan 脱敏日志、json)、挂载所有路由、`GET /health` → `{status:'ok'}`、统一错误处理(不泄露 stack 在 prod).
- [ ] **验证**:`GET /health` 200;未知路由 404;错误返回 JSON.
- [ ] **Commit** `feat: assemble express app`.

依赖:T10-T14.

---

## Phase B — 前端(solo-design 设计稿对齐)

### Task 16: solo-design 前端视觉设计(Open Design canvas)

**Files:** `.design/` canvas 6 页面:赛事列表、比赛详情、预测面板、讨论流、排行榜、登录.

- [ ] 启动 `solo-design` skill(free_exploration lane),主色足球场绿 `#0a6b3d` + 数据中性灰 `#1f2937`,卡片化布局.
- [ ] 定稿 6 页面后导出供编码对齐.
- [ ] **验证**:canvas 校验通过(非空 data、节点唯一).
- [ ] **Commit** `design: 6 pages visual design`.

**说明**:此 task 由 solo-design skill 主导产出 canvas;编码实现以 canvas 为视觉权威.

---

### Task 17: 前端脚手架与页面实现

**Files:** Create `client/` 全部

- [ ] **Step 1: 脚手架** Vite+React+Tailwind;Zustand(authStore,matchStore);Axios(api.js)+socket.io-client(socket.js).
- [ ] **Step 2: 路由** `/login /matches /matches/:id /leaderboard`;MatchDetail 内含预测面板+讨论流 Tab.
- [ ] **Step 3: 组件** MatchCard、PredictionForm、ForecastChart(概率矩阵条形)、DiscussionThread、LeaderboardTable、AuthForm.
- [ ] **Step 4: 对齐 canvas** 颜色/布局/卡片严格按 `.design` 产出.
- [ ] **Step 5: 对接 API+Socket** Axios 带 JWT 拦截器;socket join match room 收事件更新 UI.
- [ ] **Step 6: 组件测试** Testing Library 关键交互(提交预测、发评论、登录).
- [ ] **Commit** `feat: frontend pages and api integration`.

**验证**:页面与设计稿一致;核心交互可用;组件测试绿.

依赖:T16(设计稿), T15(后端 API).

---

## Phase C — 分发 / CI / 部署

### Task 18: Docker 分发

**Files:** Create `Dockerfile`, `docker-compose.yml`, `.dockerignore`

- [ ] **Step 1: 多阶段 Dockerfile** stage1 `builder`:装依赖、`prisma generate`、`vite build` 前端、`tsc` 后端;stage2 `runtime`:精简 node 镜像、复制 dist + client/dist + prisma、`EXPOSE 3000`、`CMD node dist/index.js`.
- [ ] **Step 2: docker-compose.yml** service `app`(build ., ports 3000:3000, env 从平台 secret).
- [ ] **Step 3: .dockerignore** node_modules、.git、.env、dev.db.
- [ ] **Step 4: 验证** `docker build -t football-app .` 成功;`docker run -p 3000:3000 football-app` 起 `GET /health` 200.
- [ ] **Commit** `chore: docker distribution`.

**验证**:干净环境 build+run 可启动.

依赖:T15, T17.

---

### Task 19: GitLab CI(含 unit-test job)

**Files:** Create `.gitlab-ci.yml`

- [ ] **Step 1: 写 CI**:
```yaml
stages:
  - test
  - build
unit-test:
  stage: test
  image: node:20
  script:
    - npm ci
    - cd server && npx prisma generate
    - npm test
build-image:
  stage: build
  image: docker:24
  services: [docker:24-dind]
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only: [main]
```
- [ ] **Step 2: 验证** push 后 pipeline `unit-test` job pass.
- [ ] **Commit** `ci: gitlab ci with unit-test and build`.

**验证**:CI 最后一次 pass(`unit-test` 绿).

依赖:T1.

---

### Task 20: 云部署

**Files:** Modify `README.md`(部署架构), 部署平台配置

- [ ] **Step 1: 选 Render/Railway** 免费档,连接 Git 仓库自动构建 Docker.
- [ ] **Step 2: 注入 secrets** `JWT_SECRET`、`FOOTBALL_DATA_TOKEN`、`DATABASE_URL`(平台托管 Postgres).
- [ ] **Step 3: 迁移** 部署后 `npx prisma migrate deploy`.
- [ ] **Step 4: 验证** 公网 URL 可访问 `/health` 200、WebUI 可用.
- [ ] **README 写部署架构与 CI/CD**.
- [ ] **Commit** `docs: deployment architecture`.

**验证**:提供公网可访问 URL.

依赖:T18, T19.

---

## Phase D — 过程文档与冷启动验证

### Task 21: 冷启动验证(不同 agent)

- [ ] 用 `general_purpose_task` subagent(**不导入本会话历史**),仅给 `SPEC.md`+`PLAN.md`,选 Task 3(eloService)与 Task 12(discussion) 之一试实现.
- [ ] 记录:它在何处暂停提问、暴露哪些 spec 缺陷、与原意哪些不一致、修订前后 diff.
- [ ] 写入 `SPEC_PROCESS.md`.据此修订 SPEC/PLAN.

依赖:T2,T3 写完后(T3,T12 有实现可对照).

---

### Task 22: 过程文档

**Files:** `SPEC_PROCESS.md`, `AGENT_LOG.md`, `REFLECTION.md`, `README.md`

- [ ] **SPEC_PROCESS.md**:brainstorming 关键节点、3+ 轮迭代、AI 建议(采纳/推翻)、冷启动验证记录与修订 diff、反思.
- [ ] **AGENT_LOG.md**:全程按时间戳记录 task 号、技能、prompt 关键配置、subagent 输出片段/commit hash、人工干预、教训.
- [ ] **REFLECTION.md**(1500-2500 字,学生本人写):哪些技能最有用/形式大于实质、TDD 在 AI 协作下的作用、subagent 自主时长、task 颗粒度、SPEC/PLAN 质量对实现影响(举案例)、最有效 prompt 策略、凭据与分发迫使想清的问题、重做会改什么、对 Superpowers 批判.
- [ ] **README.md**:项目简介、安装、运行、分发命令、目录结构、安全边界、key 配置、已知限制、部署架构.
- [ ] **Commit** `docs: process documents`.

依赖:全部完成.

---

## Self-Review(已执行)

- **Spec coverage**:SPEC 的 M1-M6 → T10,T11,T13,T12,T13,T14;算法→T3/T4/T5/T6;凭据→T7;分发→T18;CI→T19;部署→T20;过程文档→T21/T22. 无遗漏.
- **Placeholder**:无 TBD/TODO;算法 task 含完整测试代码.
- **Type consistency**:`expectedScore`/`updateElo`/`poissonPmf`/`scoreMatrix`/`mostLikelyScore`/`forecast`/`fuseDistributions`/`scorePrediction` 跨 task 名称一致.

---

## 执行选择

Plan 已存。采用 **Subagent-Driven**(推荐):每个 task 派新鲜 subagent + 两阶段评审。先做 git worktree 隔离(见 `using-git-worktrees`),再从 Phase A 顺序执行。
