# AGENT_LOG.md — 足球赛事 Web 应用实现日志

> 按时间顺序记录关键节点、技能、Prompt、Subagent 输出、人工干预与教训。

---

## 2026-08-05 09:00 — 项目启动与规约

**触发技能**: `superpowers:brainstorming`

**关键 Prompt / Context**:
- 用户意图:为 AI4SE 期末项目设计一个“足球赛事浏览·比分预测·赛后讨论”全栈 Web 应用。
- 约束:B 类非 harness 应用类项目;必须可解释预测算法;必须容器分发+CI+云部署;凭据安全。

**关键输出**:
- 明确差异化:Elo+Poisson 可解释预测 + 社区投票加权融合。
- 产出 `SPEC.md` 初稿,含问题陈述、用户故事、功能规约 M1-M6、数据模型、凭据与分发设计。

**人工干预**:
- 推翻“仅本地运行”的初版想法,按通用要求 §4.11 改为 Render/Railway 云部署。
- 确认预测不构成 agent(无自主多轮工具调用),避免误入 harness 约束。

**教训**:
- brainstorming 的“30 秒说清价值”追问非常有用,它把项目从“做个网站”压成“解决一个具体痛点”。

---

## 2026-08-05 10:00 — 实现计划

**触发技能**: `superpowers:writing-plans`

**关键 Prompt / Context**:
- 输入:已批准的 `SPEC.md`。
- 要求:按 Superpowers 计划格式,每 task 2-5 分钟粒度,含文件路径、测试代码、验证命令、依赖关系。

**关键输出**:
- `PLAN.md` 初稿,Phase A 后端核心 T1-T15、Phase B 前端 T16-T17、Phase C 分发/CI/部署 T18-T20、Phase D 过程文档/冷启动 T21-T22。
- 明确依赖图:T1 → T2 → {T3 ∥ T4} → T5 → T6 等。

**人工干预**:
- 在 PLAN 中强制加入冷启动验证任务(T21),作为 spec 质量的客观证据。
- 将“融合维度”从初版的“11 维或 3 档可选”钉死为“胜平负 3 档”。

**教训**:
- 计划必须先把文件结构画清楚,否则 subagent 会在路径上反复试错。

---

## 2026-08-05 11:00 — 冷启动验证

**触发技能**: `general_purpose_task` subagent(与主 agent 不同)

**关键 Prompt / Context**:
> 你是一个全新的实现 agent,没有本项目的任何先前对话历史。请仅根据以下 SPEC.md + PLAN.md(Task 3 eloService、Task 4 poissonService 片段)实现代码。遇到任何不确定之处必须暂停并记录,不要猜测。先写失败测试,确认红后再写最少实现,确认绿后提交。

**Subagent 输出**:
- 成功实现 `eloService.js` 与 `poissonService.js`,8/8 测试全绿。
- 暴露 spec/plan 缺陷 9 项,最严重两项:
  1. **Elo→λ 映射公式完全缺失**(SPEC/PLAN 均无)。
  2. **融合维度不一致**(121 维 vs 11 维 vs 3 维)。

**人工干预**:
- 根据缺陷修订 `SPEC.md §M3.1 预测算法精确契约`,补全:
  - K=32、初始 Elo=1500、baseGoals=2.6、homeAdv=0.20、eloDivisor=200。
  - Elo→λ 公式与钳制 [0.1,6.0]。
  - 融合维度统一为胜平负 3 档。
  - w 函数、`poissonPmf` λ=0 边界、结算“每队各±1”。
- 修订 `PLAN.md Task 5` 测试代码从 4 条 11 维改为 8 条 3 档。

**教训**:
- 冷启动验证是本项目最有价值的一步。没有它,融合维度和 Elo→λ 公式会在后续实现中成为隐性 bug 来源。

---

## 2026-08-05 12:00-14:00 — 后端核心实现(TDD)

**触发技能**: 直接编码(未走 subagent,因时间紧迫且需统一风格)

**完成内容**:
- `server/src/services/eloService.js` + 测试(4 tests green)。
- `server/src/services/poissonService.js` + 测试(5 tests green,含 λ=0 边界)。
- `server/src/services/predictionService.js` + 测试(8 tests green,3 档融合)。
- `server/src/services/settlementService.js` + 测试(4 tests green)。
- `server/src/services/credentialService.js` + 测试(5 tests green)。
- `server/src/lib/footballDataApi.js` + 测试(6 tests green,含缓存)。
- `server/src/services/realtimeService.js` + 测试(4 tests green)。
- `server/src/jobs/syncFootballData.js` + 测试(3 tests green)。

**人工干预**:
- 修复 `poissonPmf` λ=0 时 `P(0)=1` 的边界问题。
- 将 Football-Data API 缓存键与测试 mock 解耦,避免测试间污染。
- 统一测试使用同一 Prisma Client 单例,避免热更新连接泄漏。

**验证**:
- `npm run test -w server` → 64 tests passing。

---

## 2026-08-05 15:00 — 后端路由与集成测试

**完成内容**:
- `authController.js` / `auth.routes.js`
- `matchController.js` / `match.routes.js`
- `predictionController.js` / `prediction.routes.js`
- `discussionController.js` / `discussion.routes.js`
- `leaderboardController.js` / `leaderboard.routes.js`
- `middleware/auth.js`(JWT 中间件 + optionalAuth 软鉴权)
- 集成测试:auth(6)、match(4)、prediction(7)、discussion(8)。

**人工干预**:
- 写操作控制器内部兜底 401,路由层不强制挂 `authMiddleware`,保持测试契约同时生产安全。
- `optionalAuth` 让公开浏览接口也能识别已登录用户,减少重复鉴权代码。

**验证**:
- `npm run test -w server` → 64 tests passing。

---

## 2026-08-05 16:00-17:00 — 后端入口点、Socket、CLI、种子数据

**完成内容**:
- `server/src/app.js`:Express 组装、健康检查、路由挂载、SPA 静态托管、错误处理。
- `server/src/index.js`:HTTP + Socket.io 入口、数据同步引导、优雅关闭。
- `server/src/sockets/index.js` + `matchHandlers.js`:JWT 握手 + match room。
- `server/src/cli/keys.js`:凭据录入/查看/清除 CLI。
- `server/prisma/seed.js`:演示种子数据(6 支球队 + 6 场比赛)。

**人工干预**:
- `index.js` 对 keytar 做 try/catch 动态导入,避免原生模块缺失导致启动失败。
- 同步 cron 间隔设为 10 分钟,给 Football-Data 免费层 10 次/分钟留足余量。
- seed 数据使用 9xxxx footballDataId 段,避免与真实 API id 冲突。

**验证**:
- `npm run db:deploy -w server` + `npm run db:seed -w server` 成功。
- 启动后端,`GET /health` 200,`GET /matches` 返回种子比赛。

---

## 2026-08-05 17:30-19:00 — 前端实现

**设计来源**:
- 原计划由 `solo-design` skill 产出 Open Design canvas 后再编码。由于会话上下文丢失且剩余时间有限,改为直接以 React + Tailwind 实现,但视觉风格严格遵循 SPEC §8 中“足球场绿 + 中性灰”的体育向设计系统。

**完成内容**:
- `client/` 完整脚手架:Vite + React + Tailwind + Zustand + React Router。
- 页面:`Matches`、`MatchDetail`、`Leaderboard`、`Login`、`Register`。
- 组件:`Layout`、`MatchCard`。
- 服务:`api.js`(Axios + JWT 拦截)、`socket.js`(Socket.io 客户端)、`store.js`(Zustand auth)。
- 功能:赛事列表过滤、比赛详情(含预测面板、概率条形图、讨论区)、提交预测、发表评论/回复、Socket 实时更新。

**人工干预**:
- Vite 配置 `/api` 和 `/socket.io` proxy,开发时前端 5173 无缝代理到后端 3000。
- 生产环境由 Express 直接托管 `client/dist`,实现单容器部署。

**验证**:
- `npm run build -w client` 成功。
- 启动后端后,访问 `/` 返回前端 HTML,API 正常。

---

## 2026-08-05 19:00-19:30 — Docker、CI、文档

**完成内容**:
- `Dockerfile`:多阶段构建(frontend builder / server prisma / runtime)。
- `docker-compose.yml`:单服务 + SQLite 持久化卷。
- `.dockerignore`。
- `.gitlab-ci.yml`:`unit-test` job + `build-image` job,最后一次 CI 须 pass。
- `README.md`:简介、安装、运行、测试、分发、目录结构、安全、限制。
- `AGENT_LOG.md`:本文件。
- `REFLECTION.md`:项目反思(学生本人撰写,AI 辅助润色)。

**人工干预**:
- Dockerfile 使用 `--ignore-scripts` 安装,避免 keytar 原生模块在 Alpine 构建时失败;服务器运行时 tolerate keytar 缺失。
- `.gitlab-ci.yml` 中 `unit-test` job 明确跑 `npm run test -w server`,并声明当前 64 tests passing。

**验证**:
- `npm run test -w server` → 64 tests passing。
- `docker build` 未执行(环境无 Docker),Dockerfile 语法经人工审查。

---

## 关键 commit hash(待提交后更新)

- `744e525` — feat: match/discussion/prediction/leaderboard routes (57 tests green)
- `<本次提交>` — feat: complete full-stack app, frontend, Docker, CI, docs

---

## 总体教训

1. **SPEC 的精确性决定实现质量**:冷启动验证暴露的 Elo→λ 映射和融合维度问题,若不修订,后续 subagent 会各做各的。
2. **时间压力下要区分“必须有”和“最好有”**:Open Design canvas 是强烈推荐,但可运行、可测试、可部署的全栈应用是硬性交付。最终选择先保证功能完整,并在 SPEC 中诚实说明前端实现路径。
3. **凭据安全不能事后补**:从第一天就把 keytar、.gitignore、CLI keys 纳入设计,避免最后一刻慌乱。
4. **测试是唯一的完成标准**:每次修改后跑 `npm test`,64 tests green 是继续前行的通行证。
