# Dockerfile — 单容器构建后端 + 前端 SPA
# 技术栈:Node.js 20 + Express + Prisma(SQLite) + React(Vite)

# ==================== 阶段 1: 构建前端 ====================
FROM node:20-alpine AS build-client
WORKDIR /app
# 先安装 monorepo 依赖以复用 workspaces
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci --ignore-scripts

COPY client ./client
# Vite 生产构建输出到 client/dist
RUN npm run build -w client

# ==================== 阶段 2: 生成 Prisma Client ====================
FROM node:20-alpine AS build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --ignore-scripts
COPY server/prisma ./prisma
RUN npx prisma generate

# ==================== 最终阶段: 运行环境 ====================
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=3000

# 仅复制服务端产物(node_modules 含 Prisma Client)
COPY --from=build-server /app/server/node_modules ./node_modules
COPY --from=build-server /app/server/package*.json ./
COPY --from=build-server /app/server/prisma ./prisma
COPY server/src ./src

# 复制前端构建产物,由 Express 静态托管 + SPA fallback
# app.js 以 /app/server/src/app.js 为基准解析 ../../client/dist => /app/client/dist
COPY --from=build-client /app/client/dist ../client/dist

EXPOSE 3000

# 容器启动时自动应用数据库迁移,再启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
