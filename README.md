# Football Forecast — 足球赛事浏览·比分预测·赛后讨论

> AI4SE 期末项目 · B 类非 harness 应用类项目
> 一个整合“赛事浏览 — 比分预测 — 赛后讨论”的全栈 Web 应用,使用可解释的 Elo + Poisson 模型,并融合社区投票。

---

## 1. 项目简介

足球爱好者在比赛日常常分散在多个平台:比分 App、社媒、竞猜网站。本项目把三件事整合到同一应用,并提供一个**可解释、可回测**的预测模型:

- **赛事浏览**:查看英超等赛事的赛程、Elo 评级、实时比分。
- **比分预测**:对未开始比赛提交预测;系统返回 Elo+Poisson 概率矩阵与最可能比分。
- **赛后讨论**:在比赛详情页发表评论、回复他人,并实时收到新评论推送。
- **排行榜**:按累计积分查看预测高手。

核心差异化:**算法可解释**(不是黑盒盘口)+ **算法与社区投票加权融合**(冷启动有算法兜底,投票多后社区权重上升)。

---

## 2. 快速开始

### 2.1 环境要求

- Node.js >= 20
- npm >= 10
- (可选) Docker + docker-compose

### 2.2 本地开发(无 Docker)

```bash
# 1. 克隆后安装依赖
npm install

# 2. 生成 Prisma Client 并应用迁移
npm run db:generate -w server
npm run db:deploy -w server

# 3. 可选:写入种子数据(无需 Football-Data API token 即可演示)
npm run db:seed -w server

# 4. 启动后端(默认端口 3000)
npm run dev:server

# 5. 另开终端,启动前端(默认端口 5173,已配置 proxy 到 3000)
npm run dev:client
```

访问 http://localhost:5173。

### 2.3 配置 API Token(可选)

若要从 Football-Data.org 同步真实数据,需配置 token:

```bash
# 方式 1:安全写入系统钥匙串(推荐,开发机)
npm run key:set FOOTBALL_DATA_TOKEN
# 按提示输入 token,输入过程不可见

# 查看状态(不回显明文)
npm run key:status

# 清除
npm run key:clear FOOTBALL_DATA_TOKEN

# 方式 2:环境变量(仅本地开发,注意明文风险)
# Windows PowerShell
$env:FOOTBALL_DATA_TOKEN="your-token-here"
npm run dev:server
```

> 安全提示:`.env` 文件已列入 `.gitignore`,切勿将真实 token 提交到仓库。

---

## 3. 一键测试

```bash
npm test
```

当前服务端测试覆盖:单元测试(预测算法、Poisson、Elo、凭据、API 适配等)+ 集成测试(鉴权、赛事、预测、讨论),共 **64 tests passing**。

---

## 4. 分发与部署

### 4.1 Docker 容器(推荐)

```bash
# 构建镜像
docker build -t football-app .

# 运行(用环境变量注入 key)
docker run -d \
  -p 3000:3000 \
  -e JWT_SECRET="生产强随机密钥" \
  -e FOOTBALL_DATA_TOKEN="your-token" \
  -e DATABASE_URL="file:./prisma/dev.db" \
  --name football-app \
  football-app
```

### 4.2 docker-compose

```bash
cp .env.example .env
# 编辑 .env 填入 JWT_SECRET 与 FOOTBALL_DATA_TOKEN
docker compose up --build
```

容器启动后会自动执行 `npx prisma migrate deploy`,然后启动 Express 服务(端口 3000)。

### 4.3 云部署

本项目可部署到 Render / Railway / Fly.io 等平台:

1. 连接 Git 仓库或推送镜像。
2. 在平台控制台注入环境变量:`JWT_SECRET`、`FOOTBALL_DATA_TOKEN`、`DATABASE_URL`。
3. 启动命令已内置于 Dockerfile:`npx prisma migrate deploy && node src/index.js`。
4. 健康检查端点:`GET /health`。

**线上地址**:待部署后填写(如 `https://football-app.onrender.com`)。

---

## 5. 目录结构

```
web开发trae/
├── package.json                 # npm workspaces 根配置
├── .gitlab-ci.yml               # CI: unit-test + build-image
├── Dockerfile                   # 多阶段容器构建
├── docker-compose.yml           # 一键本地/单机运行
├── .env.example                 # 环境变量模板(无真实 key)
├── README.md                    # 本文件
├── SPEC.md                      # 设计文档
├── PLAN.md                      # 实现计划
├── SPEC_PROCESS.md              # 与 Superpowers 协作的过程记录
├── AGENT_LOG.md                 # 智能体协作日志
├── REFLECTION.md                # 项目反思
├── server/                      # Node.js + Express + Prisma 后端
│   ├── src/
│   │   ├── index.js             # HTTP + Socket.io 入口
│   │   ├── app.js               # Express 组装
│   │   ├── config.js            # 配置加载
│   │   ├── prismaClient.js      # Prisma 单例
│   │   ├── controllers/         # 业务控制器
│   │   ├── routes/              # 路由
│   │   ├── services/            # 预测、Elo、Poisson、凭据、实时等服务
│   │   ├── middleware/          # JWT 鉴权
│   │   ├── sockets/             # Socket.io 初始化与房间处理
│   │   ├── jobs/                # Football-Data 定时同步
│   │   ├── lib/                 # 第三方 API 适配层
│   │   └── cli/keys.js          # 凭据录入 CLI
│   ├── prisma/
│   │   ├── schema.prisma        # 数据模型
│   │   ├── migrations/          # 迁移文件
│   │   └── seed.js              # 演示种子数据
│   └── tests/                   # 单元 + 集成测试
└── client/                      # React + Vite + Tailwind 前端
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api.js                 # Axios 实例 + JWT 拦截
        ├── socket.js              # Socket.io 客户端封装
        ├── store.js               # Zustand auth store
        ├── components/            # Layout, MatchCard
        └── pages/                 # Matches, MatchDetail, Leaderboard, Login, Register
```

---

## 6. 安全边界说明

- **凭据绝不硬编码/提交 Git**:`FOOTBALL_DATA_TOKEN`、`JWT_SECRET` 均通过 keytar 或平台 secret 注入,`.gitignore` 已排除 `.env`、`.env.*`、`*.db`、`*.key`。
- **密码存储**:bcrypt 哈希,cost=10。
- **JWT**:有效期 2 小时,由强随机 `JWT_SECRET` 签发。
- **SQL 注入防护**:所有数据库访问通过 Prisma 参数化查询。
- **XSS/CSRF**:输入由 Prisma/Express 透传,前端 React 自动转义文本;CORS 在生产可配置白名单。
- **日志脱敏**:服务端 morgan 日志仅记录 method/url/status/latency,不记录 token 或 body。
- **钥匙串不可用时回退 env**:服务器启动会尝试读取 keytar,失败则使用环境变量;均无则跳过 Football-Data 同步,应用仍可运行(配合种子数据)。

---

## 7. 已知限制

- **数据源**:Football-Data.org 免费层限速 10 次/分钟,且无实时盘口/详细统计;预测仅基于 Elo 与历史比分,不含球员伤停、天气等因素。
- **实时性**:服务端 cron 默认定时同步(生产每 10 分钟),非秒级直播;Socket 推送用于同步服务端已收到的更新。
- **联赛范围**:MVP 默认英超(PL),但架构支持扩展其他 competition 代码。
- **刷新 token**:初版未实现,access token 2 小时过期后需重新登录。
- **部署**:Docker 镜像基于 `node:20-alpine`;`keytar` 原生模块在部分 Linux 环境可能缺失,服务器已做 try/catch 回退处理。

---

## 8. 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + Vite + Tailwind CSS + Zustand + React Router |
| 后端 | Node.js + Express + Socket.io |
| ORM/数据库 | Prisma + SQLite(开发) / PostgreSQL(生产) |
| 鉴权 | jsonwebtoken + bcryptjs |
| 凭据安全 | keytar(系统钥匙串) |
| 测试 | Vitest + Supertest |
| 容器 | Docker + docker-compose |
| CI | GitLab CI |
| 部署 | Render / Railway / Fly.io |

---

## 9. 许可证与第三方

本项目为课程作业,代码公开仅供学习。使用到的主要开源库见各 `package.json`,均遵守其原始许可证。
