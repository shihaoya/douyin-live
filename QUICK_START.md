# 快速开始 - Docker 部署（5 分钟）

适用于 **Alibaba Cloud Linux 3** 服务器。

## 🚀 一键部署

### 步骤 1: 上传项目到服务器

```bash
# 在本地电脑打包项目
cd douyin-live
tar -czf douyin-live.tar.gz --exclude='.git' --exclude='node_modules' .

# 上传到服务器（替换为你的服务器 IP）
scp douyin-live.tar.gz root@你的服务器IP:/root/
```

### 步骤 2: SSH 连接到服务器

```bash
ssh root@你的服务器IP
```

### 步骤 3: 解压并部署

```bash
# 解压项目
cd /root
tar -xzf douyin-live.tar.gz
cd douyin-live

# 运行一键部署脚本
sudo bash deploy-docker.sh
```

脚本会自动：
- ✅ 安装 Docker 和 Docker Compose
- ✅ 检查配置文件
- ✅ 构建并启动所有服务
- ✅ 显示访问地址

### 步骤 4: 配置环境变量

如果脚本提示需要配置 `.env` 文件：

```bash
vim .env
```

**必须修改的配置：**

```bash
# 数据库密码（建议修改）
MYSQL_ROOT_PASSWORD=your_strong_password
DB_PASSWORD=your_strong_password

# 抖音 Cookie（必填）
DOUYIN_COOKIE=粘贴你的Cookie
```

保存后重新运行：

```bash
sudo bash deploy-docker.sh
```

### 步骤 5: 访问应用

打开浏览器访问：`http://你的服务器IP`

---

## 📝 手动部署（可选）

如果你更喜欢手动操作：

### 1. 安装 Docker

```bash
# Alibaba Cloud Linux 3
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 配置环境变量

```bash
cp .env.docker.example .env
vim .env
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 查看日志

```bash
docker-compose logs -f
```

---

## 🔧 常用操作

### 查看服务状态

```bash
docker-compose ps
```

### 查看实时日志

```bash
docker-compose logs -f
```

### 重启服务

```bash
docker-compose restart
```

### 停止服务

```bash
docker-compose down
```

### 更新代码

```bash
git pull
docker-compose up -d --build
```

### 备份数据库

```bash
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} douyin_live > backup.sql
```

---

## ❓ 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
sudo netstat -tlnp | grep -E '80|443|3306|5678'

# 修改 .env 中的端口配置
PORT=5679
DB_PORT=3307
```

### 2. 内存不足

```bash
# 查看内存使用
free -h

# 清理 Docker 缓存
docker system prune -a
```

### 3. 无法访问

```bash
# 检查防火墙
sudo firewall-cmd --list-all

# 开放端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# 检查阿里云安全组（在控制台配置）
```

### 4. 获取抖音 Cookie

1. 打开 Chrome，访问 https://live.douyin.com
2. 按 F12 → Network 标签
3. 刷新页面
4. 复制任意请求的 `cookie` 字段
5. 粘贴到 `.env` 文件

---

## 📞 需要帮助？

- 📖 完整文档：[DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)
- 🐛 问题反馈：[GitHub Issues](https://github.com/shihaoya/douyin-live/issues)

---

**祝你使用愉快！** 🎉
