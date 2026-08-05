# SPEC.md — 足球赛事浏览·比分预测·赛后讨论 全栈 Web 应用

> AI4SE 期末项目 · B 类应用类项目(非 harness)
> 由 Superpowers `brainstorming` 技能沉淀产出
> 日期:2026-08-05

---

## 1. 问题陈述(Problem Statement)

### 要解决什么问题
足球爱好者在比赛日分散在多个平台:比分App看实时比分、社媒看热议、竞猜App做预测。体验割裂,且主流竞猜类产品要么纯付费盘口、要么无算法可解释性。本项目把"赛事浏览—比分预测—赛后讨论"三件事整合到一个应用中,并提供一个**可解释、可回测**的预测模型(Elo+Poisson+社区投票融合),让用户既能看球、又能用模型与社区智慧做预测、还能在同一页面赛后讨论。

### 目标用户
- 高校/年轻足球爱好者,有看球习惯,对数据与预测感兴趣。
- 想用"不只是凭直觉"的方式预测比分,并和同好比较预测准确度。

### 为什么值得做
1. 三大功能闭环,真实可用,30 秒内能向陌生人说清"为什么有人用"。
2. 预测算法可解释(Elo 评级 + 泊松概率矩阵),区别于黑盒竞猜。
3. 社区投票与算法加权融合,冷启动有算法兜底、成熟后有社区信号——这是真实工程难点。
4. 满足课程"3 个以上职责清晰的功能模块 + 工程深度"要求。

---

## 2. 用户故事(User Stories,遵循 INVEST)

- **US1**:作为访客,我想注册/登录,以便提交预测和参与讨论。(Independent,有独立鉴权模块)
- **US2**:作为登录用户,我想浏览当日/未来英超赛程并查看双方球队 Elo 评级,以便决定是否预测。(Negotiable 展示字段)
- **US3**:作为登录用户,我想对未开始的比赛提交我的预测比分,以便赛后结算积分。(Valuable,核心闭环)
- **US4**:作为登录用户,我想看到模型预测的最可能比分及其概率分布,以便理解算法依据。(Estimatable,可解释)
- **US5**:作为登录用户,我想在比赛详情页实时收到比分与状态更新,而不必刷新页面。(Small,Socket)
- **US6**:作为登录用户,我想在赛后讨论区发表评论并回复他人,以便交流观赛感受。(Testable,CRUD)
- **US7**:作为登录用户,我想查看预测排行榜与我的累计积分,以便衡量自己的预测水平。(Independent)
- **US8**:作为管理员,我想删除违规评论,以便维护社区秩序。(Negotiable,权限)

---

## 3. 功能规约(Functional Spec,按模块:输入/行为/输出/边界/错误)

### M1 鉴权模块(Auth)
- 输入:email、password;注册另需 username。
- 行为:bcrypt 哈希存储;签发 JWT(access,2h);刷新可选。
- 输出:`{ token, user }`。
- 边界:email 唯一;密码 ≥8 位;用户名 1-20 字符。
- 错误:重复注册 409;凭据错误 401;字段缺失 400。

### M2 赛事浏览模块(Matches)
- 输入:可选 `competition`、`dateFrom/dateTo`、`status` 过滤;分页 `page/limit`。
- 行为:从本地 DB 读取(node-cron 已同步 Football-Data);返回赛程列表。
- 输出:`{ matches: [{id, competition, utcDate, status, homeTeam, awayTeam, score}] }`。
- 边界:仅免费层 12 赛事;MVP 默认英超(PL)。
- 错误:API 未同步且 DB 空 → 503 提示"数据同步中"。

### M3 比分预测模块(Prediction)
- 输入:POST `{ matchId, homeScore, awayScore }`(仅 status=SCHEDULED 可提交)。
- 行为:每用户每比赛仅一条(重复则更新);存 Prediction。
- 输出:`{ prediction }`。
- 边界:比赛已开始/已结束不可提交 → 409;比分非负整数 → 400。
- 算法侧:`GET /matches/:id/forecast` 返回 Elo+Poisson 比分概率矩阵 + 最可能比分。
- 社区侧:`GET /matches/:id/community` 返回用户预测聚合分布。
- 融合:`GET /matches/:id/prediction-final` 返回 `P_final = w·P_algo+(1−w)·P_community`,w 随预测数动态下调。
- 结算:比赛 `FINISHED` 后由 cron/事件触发,按规则计分(命中+3,分差±1 +1),更新 Prediction.points 与 User.totalPoints/eloScore。
- 错误:未登录 401;非本人预测访问 403。

### M3.1 预测算法精确契约(冷启动验证修订)
> 经冷启动验证(不同 agent 仅凭 SPEC+PLAN 试实现)修订,补全原缺失的参数与维度定义。

**参数(全部定值,消除区间歧义)**
- K 因子 = 32(固定;SPEC 原"20-40"区间无选择规则,已废弃)。
- 初始 Elo = 1500。
- 基准总进球 `baseGoals` = 2.6(联赛);欧冠 2.8(按 competition 校准)。
- 主场优势 `homeAdv` = 0.20。
- Elo 调整系数 `eloDivisor` = 200。

**Elo → λ 映射(原严重缺失,现补全)**
```
expectedGoalDiff = (homeElo - awayElo) / eloDivisor        // 主队视角的期望进球差
λ_home = (baseGoals/2 + expectedGoalDiff/2) × (1 + homeAdv)
λ_away = (baseGoals/2 - expectedGoalDiff/2) × (1 - homeAdv/2)
// 钳制:λ ∈ [0.1, 6.0],避免负值与高 λ 截断失真
```
约束:`λ_home + λ_away ≈ baseGoals × (1 + homeAdv/2)`(总量近似守恒)。

**比分概率矩阵**(11×11,主 0-10 × 客 0-10)
- `P_algo(h,a) = poissonPmf(h, λ_home) × poissonPmf(a, λ_away)`,主客独立假设(已知局限,见 R1)。
- λ=0 时 `poissonPmf(0,0)=1, poissonPmf(k>0,0)=0`(冷启动边界修复)。
- 高 λ(>4)尾部截断使矩阵和 <1,接口返回 `matrixSum` 供前端标注,不强行归一化。
- `mostLikelyScore` = 矩阵中概率最大的 `[h,a]`;等概率 tie-break 取较小 h、再较小 a。

**融合维度 = 胜平负 3 档(原 121 vs 11 维歧义,现统一为 3)**
- 算法侧 3 档:`P_algo_3 = [P(homeWin)=Σ_{h>a}, P(draw)=Σ_{h==a}, P(awayWin)=Σ_{h<a}]`。
- 社区侧 3 档:每条用户预测 (homeScore,awayScore) 映射到胜/平/负,计数后归一;无投票时 Dirichlet 平滑 α=1(即 `[1/3,1/3,1/3]`)。
- 融合:`P_final_3[i] = w·P_algo_3[i] + (1−w)·P_community_3[i]`,维度一致(3)。
- 权重函数:`w = max(0.5, 0.7 − 0.02×min(votes,10))`;votes=0 时 w=0.7(纯算法),votes≥10 时 w=0.5。
- 接口 `GET /matches/:id/prediction-final` 返回 `{ algo3, community3, final3, mostLikely, w, votes }`;`mostLikely` 仍取自算法矩阵(融合只调整 3 档置信,不改具体比分)。

**结算规则(钉死歧义)**
- 完全命中实际比分 → +3。
- 每队预测进球与实际之差均 ≤1(但不完全命中)→ +1。例:实际(2,0)、预测(1,1)→ |2-1|≤1 且 |0-1|≤1 → +1。
- 其他 → 0。
- 比分差(margin)解读已废弃,采用"每队各 ±1"解读(更直观、与用户直觉一致)。

### M4 赛后讨论模块(Discussion)
- 输入:POST `{ matchId, content, parentId? }`;GET 按 matchId 分页 `page/limit`;PATCH/DELETE 按 id。
- 行为:扁平 + 一层回复(parentId 指向根评论);本人可改删,管理员可删任意。
- 输出:评论树 `{ id, user, content, createdAt, replies[] }`。
- 边界:content 1-500 字;parentId 必须同 matchId;一层回复(回复不能再有 parentId)。
- 错误:未登录 401;改删非本人且非管理员 403;空内容 400。

### M5 排行榜模块(Leaderboard)
- 输入:`GET /leaderboard?scope=week|all`。
- 行为:按 totalPoints 降序,返回 Top N + 当前用户排名。
- 输出:`[{ rank, username, points, elo }]`。
- 边界:week 按 createdAt 本周聚合。
- 错误:无数据返回空数组。

### M6 实时推送(Realtime)
- 输入:Socket `match:join { matchId }`。
- 行为:服务端校验 JWT 握手;加入 room `match:{matchId}`;推送 `match:score`/`match:status`/`discussion:new|update|delete`/`leaderboard:update`。
- 输出:仅推送给该 room 订阅者。
- 边界:非法 token 拒连;离开页面自动离 room。
- 错误:握手失败返回 connect_error。

---

## 4. 非功能性需求(Non-Functional)

### 性能
- 列表接口 p95 < 300ms(读本地 DB,已缓存)。
- Socket 推送延迟 < 1s。
- Football-Data 调用受 10 次/分限制,cron 间隔 ≥ 1 分钟。

### 安全(含凭据威胁模型)
- **凭据清单**:Football-Data API Token、JWT Secret、DB URL。
- **存储**:服务端用 `keytar` 写入 OS 钥匙串(Windows Credential Manager);绝不硬编码/提交 Git/写日志或终端 history/明文配置。`.env` 仅开发来源,SPEC 注明其明文与进程环境可见风险。
- **首次运行引导**:交互式隐藏录入 key;支持查看(不回显明文)/更新/清除。
- **威胁模型与对策**:
  - 威胁① 本地进程环境可读 env → 对策:keytar 优先,env 仅本地开发。
  - 威胁② `.env` 明文落盘 → 对策:`.gitignore` 排除;部署用平台 secret 注入。
  - 威胁③ 误提交 history → 对策:提交前自查 + CI 扫描关键词。
  - 威胁④ JWT 泄露 → 对策:短时效(2h)+ 强随机 secret。
  - 威胁⑤ SQL 注入 → 对策:Prisma 参数化查询,禁拼接。
  - 威胁⑥ XSS/CSRF → 对策:输入转义、CORS 白名单、JWT via header。
- **密码**:bcrypt cost=10。

### 可用性
- 公网可访问 WebUI(部署后),响应式适配桌面/移动。
- 关键操作有加载态与错误提示。

### 可观测性
- 结构化日志(脱敏);请求 log 含 method/path/status/latency,不含 token/key。
- 健康检查 `GET /health`。

---

## 5. 系统架构(System Architecture)

### 组件图
```
┌─────────── 前端 React SPA (Vite+Tailwind) ──────────┐
│ 赛事浏览│比分预测│赛后讨论│排行榜│登录  │
│ Axios(+JWT) │ socket.io-client(按 match 分 room)     │
└──────────────────────┬──────────────────────────────┘
      REST(JWT)         │         WebSocket(JWT 握手)
┌──────────────────────┴──────────────────────────────┐
│            后端 Express + Socket.io                  │
│  authMW → routes: auth/match/prediction/discussion/leader │
│  services: match / prediction(Elo+Poisson+投票融合)     │
│           / discussion(CRUD) / realtime / credential    │
│  Prisma ORM → SQLite(dev) / PostgreSQL(prod)            │
│  Football-Data 适配层(node-cron 同步 + 内存/DB 缓存)     │
└──────────────────────┬──────────────────────────────┘
                         │ X-Auth-Token ~10次/分
                Football-Data.org API v4(免费层)
```

### 数据流
- 赛事数据:Football-Data → (cron) → 适配层 → Prisma → DB → REST/Socket → 前端。
- 预测:前端 POST → Prediction 表;算法读 Team.eloRating 计算矩阵。
- 实时:比分更新 → realtimeService 广播 room `match:{id}` → 前端。

### 外部依赖
- Football-Data.org API v4(免费,需 token)。
- 部署平台(Render/Railway)与镜像 registry。
- 无 LLM 依赖(B 类无 agent,预测为确定性算法)。

---

## 6. 数据模型(Data Model)

```
User        id, email(unique), passwordHash, username(unique),
            eloScore(default 1500), totalPoints(default 0),
            role(enum USER|ADMIN, default USER), createdAt
Team        id, name, footballDataId(unique), eloRating(default 1500), crestUrl
Match       id, footballDataId(unique), competition, matchday, status,
            homeTeamId→Team, awayTeamId→Team, homeScore?, awayScore?, utcDate
Prediction  id, userId→User, matchId→Match, homeScore, awayScore,
            points(default null), createdAt
            唯一约束:(userId, matchId)
Discussion  id, matchId→Match, userId→User, content,
            parentId?→Discussion(自关联,仅一层), createdAt, updatedAt
```
约束:Prediction.(userId,matchId) 唯一;Discussion.parentId 指向同 matchId 根评论且不可再嵌套。

---

## 7. 凭据与分发设计(Credential & Distribution)

### 凭据存储方案
- 服务端 `keytar` → Windows Credential Manager(开发机)/ Linux Secret Service(部署)。
- 首次启动若 key 缺失:交互式隐藏录入 → 写钥匙串 → 后续从钥匙串读。
- 提供命令:`npm run key:set`、`npm run key:status`(不回显)、`npm run key:clear`。
- 部署平台用环境 secret 注入到运行时进程(不落 `.env` 明文文件)。

### 录入/更新/清除流程
1. 录入:隐藏输入读 token → 校验非空 → keytar.setPassword。
2. 查看:`key:status` 输出 `FOOTBALL_DATA_TOKEN: set ✓ / unset ✗`,绝不回显明文。
3. 更新:再次 `key:set` 覆盖。
4. 清除:`key:clear` 调 keytar.deletePassword。

### 分发形态
- **容器**(带服务端项目首选):多阶段 `Dockerfile`(builder 构建前端+编译 → runtime 精简镜像);`docker-compose.yml` 启 server(+可选 db)。
- 获取:`docker build -t football-app .` → `docker run -p 3000:3000 football-app`(key 经环境/secret 注入)。
- README 写明:获取、运行、key 在目标机安全配置、已知限制(平台/架构/依赖)。

---

## 8. 技术选型与理由(Tech Selection)

| 层 | 选型 | 理由 |
|---|---|---|
| 前端 | React 18 + Vite + Tailwind | 生态成熟、热更新快、Tailwind 易对齐设计稿 |
| 状态/路由 | Zustand + React Router | 轻量、避免 Redux 样板 |
| 实时 | socket.io-client | 与后端 Socket.io 配套、自动重连 |
| 后端 | Node.js + Express | JS 全栈统一、生态丰富 |
| ORM | Prisma | 类型安全、迁移管理、参数化防注入 |
| DB | SQLite(dev)/PostgreSQL(prod) | dev 零配置;prod 用平台托管 PG |
| 实时 | Socket.io | room 分组广播、握手鉴权 |
| 鉴权 | jsonwebtoken + bcrypt | 标准 JWT、密码哈希 |
| 凭据 | keytar | 跨平台钥匙串、满足 §3.1 |
| 定时 | node-cron | 定时同步 Football-Data |
| 测试 | Vitest + Testing Library + Supertest | 单元/组件/集成一站式 |
| 分发 | Docker + compose | 带服务端首选、一键启动 |
| CI | GitLab CI(`.gitlab-ci.yml`) | NJU Git 多为 GitLab;必含 `unit-test` job |
| 部署 | Render/Railway | 学生免费额度、公网 WebUI |

### 前端设计系统与 skill(Open Design)
- 使用 **solo-design**(Open Design canvas)进行界面开发:赛事列表、比赛详情、预测面板、讨论流、排行榜、登录共 6 个页面先在 canvas 设计定稿,再据此编码,确保视觉一致。
- 设计风格:体育向、信息密度适中、主色取足球场绿 + 数据卡片中性灰,强调可读性。

### 无 agent 判定(B.2)
- 预测为单轮确定性算法(Elo+Poisson 计算),讨论为 CRUD——均无"自主多轮工具调用循环",不构成 agent,不触发 harness 约束。

---

## 9. 验收标准(Acceptance Criteria)

- **M1 鉴权**:注册→登录→拿到 JWT;无 token/过期/伪造访问受保护端点均 401。
- **M2 赛事**:`GET /matches` 返回英超赛程;过滤与分页正确;DB 空时 503。
- **M3 预测**:未开始比赛可提交;已开始/结束 409;`/forecast` 返回概率矩阵且最可能比分概率最高;`FINISHED` 后自动结算,积分规则正确(命中+3,分差±1 +1)。
- **M4 讨论**:CRUD 全通;仅本人可改删、管理员可删任意;一层回复正确;空内容 400。
- **M5 排行榜**:按积分降序,含当前用户排名。
- **M6 实时**:多客户端订阅同 room 收到 `match:score`/`discussion:new`;非法 token 拒连。
- **凭据**:key 不在源码/日志/git history;`key:set/status/clear` 可用且 status 不回显。
- **分发**:`docker build`+`docker run` 在干净环境可启动。
- **CI**:`.gitlab-ci.yml` 的 `unit-test` job 跑 `npm test` 全绿;最后一次 CI pass。
- **部署**:提供公网可访问 WebUI URL。
- **一键测试**:`npm test` 跑全部单元+集成测试且通过。

---

## 10. 风险与未决问题(Risks & Open Issues)

- **R1 Football-Data 免费层无赔率/统计**:预测仅基于历史比分与 Elo,不含实时盘口 → 缓解:回测校准参数,明确说明局限。
- **R2 实时比分更新频率受限**:免费层非真"秒级直播" → 缓解:cron 间隔可调;演示支持手动触发模拟更新。
- **R3 预测冷启动无社区数据**:`P_community` 用 Dirichlet 平滑,初始近似均匀;w 初始 0.7 偏算法。
- **R4 冷启动验证暴露 spec 缺陷**:不同 agent 仅凭 SPEC+PLAN 试实现,可能发现模糊处 → 这是预期收益,修订后记入 SPEC_PROCESS。
- **R5 部署平台免费额度限制**:可能休眠/限流 → 选 Render/Railway 免费档,README 注明限制。
- **R6 SQLite→PostgreSQL 迁移**:Prisma 屏蔽差异,但需在 prod 配置 connection string。
- **未决**:是否实现 refresh token(初版可选,先 access 2h 足够 MVP);是否支持多语言(否,中文)。
- **O1 subagent 脱轨风险**:task 颗粒度需够细(2-5 分钟),否则 agent 易偏;PLAN.md 严格标注依赖与验证。
- **O2 评审流于形式**:需两阶段(spec 合规→代码质量),Critical 必修才进下一 task。

---

> 本 SPEC 经 brainstorming 与用户协作产出;下一步进入 `writing-plans` 产出 `PLAN.md`,随后做冷启动验证(不同 agent 仅凭 SPEC+PLAN 试实现 1-2 task)。
