# Alibaba Cloud Linux 3 Docker 部署清单

## 📋 部署前准备

### 1. 服务器要求

- ✅ **操作系统**: Alibaba Cloud Linux 3.2104 LTS 64位
- ✅ **CPU**: 至少 1 核（推荐 2 核）
- ✅ **内存**: 至少 2GB（推荐 4GB）
- ✅ **硬盘**: 至少 10GB 可用空间
- ✅ **网络**: 公网 IP，开放 80/443 端口

### 2. 阿里云控制台配置

#### 安全组规则

在阿里云 ECS 控制台配置安全组：

| 端口 | 协议 | 用途 | 是否必需 |
|------|------|------|----------|
| 80 | TCP | HTTP 访问 | ✅ 是 |
| 443 | TCP | HTTPS 访问（可选） | ⚠️ 推荐 |
| 22 | TCP | SSH 远程连接 | ✅ 是 |

**注意：**
- ❌ 不要开放 3306（MySQL）
- ❌ 不要开放 5678（后端 API）
- 这些端口仅在内网通过 Docker 网络通信

---

## 🚀 部署步骤

### 方式一：一键部署脚本（推荐）

```bash
# 1. 上传项目到服务器
# 在本地执行：
scp douyin-live.tar.gz root@你的服务器IP:/root/

# 2. SSH 连接服务器
ssh root@你的服务器IP

# 3. 解压并部署
cd /root
tar -xzf douyin-live.tar.gz
cd douyin-live
sudo bash deploy-docker.sh
```

脚本会自动完成：
- ✅ 安装 Docker 和 Docker Compose
- ✅ 创建 .env 配置文件
- ✅ 检查必要参数
- ✅ 构建并启动所有容器
- ✅ 显示访问地址和常用命令

### 方式二：手动部署

```bash
# 1. 安装 Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 2. 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. 验证安装
docker --version
docker-compose --version

# 4. 配置环境变量
cp .env.docker.example .env
vim .env

# 5. 启动服务
docker-compose up -d

# 6. 查看日志
docker-compose logs -f
```

---

## ⚙️ 配置说明

### 必须配置的项目

编辑 `.env` 文件：

```bash
# 1. 数据库密码（强烈建议修改）
MYSQL_ROOT_PASSWORD=your_strong_password_here
DB_PASSWORD=your_strong_password_here

# 2. 抖音 Cookie（必填）
DOUYIN_COOKIE=paste_your_cookie_here
```

### 如何获取抖音 Cookie

1. 打开 Chrome 浏览器
2. 访问 https://live.douyin.com
3. 按 `F12` 打开开发者工具
4. 切换到 **Network** 标签
5. 刷新页面
6. 点击任意请求
7. 在 **Request Headers** 中找到 `cookie` 字段
8. 复制完整内容（非常长的一串）
9. 粘贴到 `.env` 文件的 `DOUYIN_COOKIE=` 后面

**示例：**
```bash
DOUYIN_COOKIE=passport_csrf_token=xxx; sid_guard=xxx; uid_tt=xxx; ...
```

### 可选配置

```bash
# QQ 机器人（如需开播提醒）
QQ_BOT_APP_ID=your_app_id
QQ_BOT_APP_SECRET=your_app_secret
QQ_BOT_USER_ID=your_openid

# Server酱（微信推送）
SERVERCHAN_SENDKEY=your_sendkey

# 飞书机器人
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
```

---

## ✅ 验证部署

### 1. 检查容器状态

```bash
docker-compose ps
```

应该看到 3 个容器都在运行：
- `douyin-live-mysql` - 健康状态
- `douyin-live-backend` - 健康状态
- `douyin-live-frontend` - 健康状态

### 2. 检查日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f mysql
```

### 3. 测试访问

```bash
# 在服务器上测试
curl http://localhost

# 从浏览器访问
http://你的服务器IP
```

### 4. 测试 API

```bash
# 健康检查
curl http://localhost:5678/api/health

# 应该返回：
{"status":"ok","timestamp":"2024-..."}
```

---

## 🔧 常用管理命令

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

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入 MySQL 命令行
docker-compose exec mysql mysql -u root -p

# 进入前端 Nginx
docker-compose exec frontend sh
```

### 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} douyin_live > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} douyin_live < backup_20240101.sql
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 清理旧镜像
docker image prune -f
```

### 清理磁盘

```bash
# 查看磁盘使用
df -h
docker system df

# 清理未使用的资源
docker system prune -a

# 清理日志
docker-compose exec backend truncate -s 0 /app/logs/*.log
```

---

## 🐛 故障排查

### 问题 1：容器无法启动

```bash
# 查看详细错误
docker-compose logs

# 检查端口占用
sudo netstat -tlnp | grep -E '80|443|3306|5678'

# 检查 Docker 状态
systemctl status docker
```

### 问题 2：无法访问网页

```bash
# 检查防火墙
sudo firewall-cmd --list-all

# 开放端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# 检查阿里云安全组（在控制台确认已开放 80 端口）
```

### 问题 3：数据库连接失败

```bash
# 检查 MySQL 容器
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 测试连接
docker-compose exec mysql mysql -u douyin -p douyin_live
```

### 问题 4：WebSocket 连接失败

检查 Nginx 配置：

```bash
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /ws"
```

确保包含 WebSocket 升级配置。

### 问题 5：收不到开播通知

```bash
# 检查后端日志
docker-compose logs backend | grep -i "qq\|monitor"

# 检查环境变量
docker-compose exec backend env | grep QQ_BOT

# 测试 QQ 机器人
curl -X POST http://localhost:5678/api/qqbot/test-message \
  -H "Content-Type: application/json" \
  -d '{"content":"测试消息"}'
```

### 问题 6：内存不足

```bash
# 查看内存使用
free -h

# 查看容器资源使用
docker stats

# 限制容器资源（编辑 docker-compose.yml）
# 添加：
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

---

## 🔒 安全加固

### 1. 修改默认密码

```bash
# 编辑 .env 文件
MYSQL_ROOT_PASSWORD=very_strong_password_123!@#
DB_PASSWORD=another_strong_password_456!@#
```

### 2. 配置防火墙

```bash
# 只开放必要端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### 3. 配置 SSL（推荐）

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx

# 获取证书（替换为你的域名）
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

### 4. 定期备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/douyin-live"
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} douyin_live > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed at $(date)"
EOF

chmod +x backup.sh

# 添加到定时任务
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /root/douyin-live/backup.sh
```

---

## 📊 监控和维护

### 查看资源使用

```bash
# 实时查看容器资源
docker stats

# 查看磁盘使用
docker system df

# 查看系统资源
htop
```

### 日志轮转

创建 `/etc/logrotate.d/docker-containers`：

```
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

---

## 📞 获取帮助

- 📖 详细文档：[DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)
- 🚀 快速开始：[QUICK_START.md](QUICK_START.md)
- 🐛 问题反馈：[GitHub Issues](https://github.com/shihaoya/douyin-live/issues)

---

**部署成功！祝使用愉快！** 🎉
