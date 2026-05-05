# 多阶段构建 - 后端服务
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY . .

# 生产环境
FROM node:18-alpine

WORKDIR /app

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制 node_modules 和源代码
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 5678

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5678/api/health || exit 1

# 启动应用
CMD ["node", "src/server.js"]
