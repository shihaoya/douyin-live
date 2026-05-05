# 抖音直播监控系统 - Docker 部署指南

适用于 **Alibaba Cloud Linux 3.2104 LTS** 及其他 Linux 发行版。

## 📋 系统要求

- **操作系统**: Alibaba Cloud Linux 3 / CentOS 8+ / Ubuntu 20.04+
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.0 或更高版本
- **内存**: 至少 2GB RAM（推荐 4GB）
- **硬盘**: 至少 10GB 可用空间

## 🚀 快速开始

### 1. 安装 Docker 和 Docker Compose

#### Alibaba Cloud Linux 3 / CentOS 8+

```bash
# 安装 Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version

# 将当前用户添加到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER
# 重新登录使更改生效
```

#### Ubuntu 20.04+

```bash
# 安装 Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
```

### 2. 克隆项目

```bash
git clone https://github.com/shihaoya/douyin-live.git
cd douyin-live
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env

# 编辑配置文件
vim .env
```

**必须配置的项：**

```bash
# 数据库密码（建议修改为强密码）
MYSQL_ROOT_PASSWORD=your_strong_password
DB_PASSWORD=your_strong_password

# 抖音 Cookie（从浏览器获取）
DOUYIN_COOKIE=your_douyin_cookie_here
```

**如何获取抖音 Cookie：**

1. 打开 Chrome 浏览器，访问 https://live.douyin.com
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面
5. 找到任意请求，查看 Request Headers
6. 复制 `cookie` 字段的全部内容
7. 粘贴到 `.env` 文件的 `DOUYIN_COOKIE=` 后面

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 访问应用

打开浏览器访问：`http://你的服务器IP`

- 前端页面：`http://你的服务器IP`
- 后端 API：`http://你的服务器IP:5678`

## 🔧 常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重启单个服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f mysql
docker-compose logs -f frontend
```

### 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} douyin_live > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} douyin_live < backup_20240101_120000.sql
```

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 清理未使用的镜像
docker image prune -f
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -p

# 进入前端容器
docker-compose exec frontend sh
```

## 📊 服务说明

### 容器列表

| 容器名 | 服务 | 端口 | 说明 |
|--------|------|------|------|
| douyin-live-mysql | MySQL 8.0 | 3306 | 数据库服务 |
| douyin-live-backend | Node.js Backend | 5678 | 后端 API 服务 |
| douyin-live-frontend | Nginx Frontend | 80, 443 | 前端 Web 服务 |

### 数据持久化

以下数据通过 Docker Volume 持久化：

- **MySQL 数据**: `mysql_data` volume
- **后端日志**: `backend_logs` volume
- **QQ OpenID**: `server/qqbot_openid.json`

### 网络架构

```
Internet
    ↓
  Nginx (80/443)
    ↓
  Backend (5678) ←→ MySQL (3306)
```

## 🔒 安全配置

### 1. 配置防火墙

```bash
# Alibaba Cloud Linux / CentOS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Ubuntu
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 配置阿里云安全组

在阿里云控制台配置安全组规则：

- 允许 TCP 80 端口（HTTP）
- 允许 TCP 443 端口（HTTPS，可选）
- **不要**开放 3306、5678 等内部端口

### 3. 修改默认密码

编辑 `.env` 文件，修改以下密码：

```bash
MYSQL_ROOT_PASSWORD=your_very_strong_password
DB_PASSWORD=your_very_strong_password
```

### 4. 配置 SSL（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx  # Alibaba Cloud Linux

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

## 🐛 故障排查

### 1. 服务无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查容器状态
docker-compose ps

# 检查端口占用
sudo netstat -tlnp | grep -E '80|443|3306|5678'
```

### 2. 数据库连接失败

```bash
# 检查 MySQL 是否启动
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u douyin -p douyin_live
```

### 3. 前端无法访问

```bash
# 检查 Nginx 配置
docker-compose exec frontend nginx -t

# 查看 Nginx 日志
docker-compose logs frontend

# 重启前端服务
docker-compose restart frontend
```

### 4. WebSocket 连接失败

检查 Nginx 配置是否正确代理 WebSocket：

```bash
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /ws"
```

### 5. 收不到开播通知

```bash
# 检查后端日志
docker-compose logs backend | grep -i "qq\|notification"

# 检查环境变量
docker-compose exec backend env | grep QQ_BOT

# 测试 QQ 机器人
curl -X POST http://localhost:5678/api/qqbot/test-message \
  -H "Content-Type: application/json" \
  -d '{"content":"测试消息"}'
```

### 6. 磁盘空间不足

```bash
# 查看磁盘使用情况
df -h

# 清理 Docker 未使用的资源
docker system prune -a

# 清理日志
docker-compose exec backend truncate -s 0 /app/logs/*.log
```

## 📈 性能优化

### 1. 限制容器资源

编辑 `docker-compose.yml`，添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  mysql:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

### 2. MySQL 优化

创建 `mysql-custom.cnf`：

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 512M
query_cache_size = 64M
tmp_table_size = 64M
max_heap_table_size = 64M
```

挂载到容器：

```yaml
volumes:
  - ./mysql-custom.cnf:/etc/mysql/conf.d/custom.cnf
```

### 3. Nginx 优化

已在 `nginx.conf` 中启用 Gzip 压缩和静态资源缓存。

## 🔄 自动化部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash

echo "=========================================="
echo "  抖音直播监控系统 - Docker 部署"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从模板复制"
    cp .env.docker.example .env
    echo "请编辑 .env 文件配置必要参数"
    exit 1
fi

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull

# 构建并启动
echo "🚀 构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "✅ 服务状态:"
docker-compose ps

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  访问地址: http://$(hostname -I | awk '{print $1}')"
echo "=========================================="
```

使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 📝 环境变量说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| MYSQL_ROOT_PASSWORD | MySQL root 密码 | root123456 | 是 |
| DB_USER | 数据库用户名 | douyin | 是 |
| DB_PASSWORD | 数据库密码 | douyin123456 | 是 |
| DB_NAME | 数据库名称 | douyin_live | 是 |
| DOUYIN_COOKIE | 抖音 Cookie | - | 是 |
| PORT | 后端端口 | 5678 | 否 |
| LOG_LEVEL | 日志级别 | info | 否 |
| QQ_BOT_APP_ID | QQ 应用 ID | - | 否 |
| QQ_BOT_APP_SECRET | QQ 应用密钥 | - | 否 |
| QQ_BOT_USER_ID | 用户 OpenID | - | 否 |

## 🎯 下一步

1. ✅ 配置环境变量
2. ✅ 启动服务
3. ✅ 访问 Web 界面
4. ✅ 添加直播间
5. ✅ 配置 QQ 机器人（可选）
6. ✅ 配置域名和 SSL（推荐）

## 📞 技术支持

如遇到问题：

1. 查看日志：`docker-compose logs -f`
2. 检查配置：确认 `.env` 文件正确
3. 查阅文档：README.md
4. 提交 Issue：GitHub Issues

---

**祝你部署顺利！** 🎉
