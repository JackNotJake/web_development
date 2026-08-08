# Dockerfile — 单容器构建后端 + 前端 SPA
# 技术栈:Node.js 20 + Express + Prisma(SQLite) + React(Vite)
# 说明:先复制完整仓库再安装,避免 workspace 多阶段安装上下文不完整导致 npm ci 失败。

# ==================== 阶段 1:构建产物 ====================
FROM node:20 AS builder
WORKDIR /app

# 复制完整源码(排除项见 .dockerignore)
COPY . .

# 在完整 workspace 上下文下安装依赖,并跳过 postinstall 避免原生模块编译问题
RUN npm ci --ignore-scripts

# 显式生成 Prisma Client
RUN npm run db:generate -w server

# 构建前端 SPA,输出到 client/dist
RUN npm run build -w client

# ==================== 阶段 2:运行环境 ====================
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 安装运行 keytar 需要的系统库;若钥匙串不可用,应用会回退到环境变量
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

# npm workspaces 将依赖提升到根目录 /app/node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制服务端运行所需文件
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/src ./server/src

# 复制前端构建产物,由 Express 静态托管 + SPA fallback
# app.js 以 /app/server/src/app.js 为基准解析 ../../client/dist => /app/client/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

# 容器启动时自动应用数据库迁移,需要时写入种子数据,再启动服务
CMD ["sh", "-c", "cd /app/server && npx prisma migrate deploy && npm run db:seed && node src/index.js"]
