# 抖音直播监控系统

一个功能完整的抖音直播实时监控平台，支持直播间管理、消息采集、礼物统计、开播提醒等功能。

## ✨ 功能特性

### 🎯 核心功能

- **直播间监控** - 实时监控多个抖音直播间状态
- **消息采集** - 通过 WebSocket 实时采集直播间消息（弹幕、礼物、点赞等）
- **礼物统计** - 完整的礼物数据记录和分析
- **开播提醒** - 自动检测直播间开播并推送通知
- **数据可视化** - 直观的统计数据展示

### 🔔 通知推送

- **QQ 机器人** - 集成 QQ 开放平台，开播时自动发送 QQ 消息提醒
- **Server酱** - 支持 Server酱3 推送服务
- **飞书机器人** - 支持飞书 webhook 推送
- **可扩展** - 预留接口，可轻松集成其他推送渠道

### 📊 数据统计

- 直播间观众人数趋势
- 礼物价值统计
- 消息类型分布
- 互动数据分析

### 🛠️ 管理功能

- 直播间添加/删除/编辑
- 消息类型自定义排序
- 礼物列表管理
- 数值映射配置

## 🏗️ 技术栈

### 后端
- **Node.js** + **Express** - Web 服务器
- **MySQL** - 数据存储
- **WebSocket** - 实时通信
- **Protobuf** - 抖音消息协议解析
- **PM2** - 进程管理

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 现代前端构建工具
- **Element Plus** - UI 组件库
- **Axios** - HTTP 客户端

### 第三方集成
- **QQ 开放平台** - QQ 机器人消息推送
- **Server酱3** - 微信消息推送
- **飞书开放平台** - 飞书机器人

## 📦 项目结构

```
douyin-live/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/   # 控制器
│   │   ├── routes/        # 路由
│   │   ├── utils/         # 工具函数
│   │   │   ├── LiveMonitor.js    # 开播监听器
│   │   │   └── qqbot.js          # QQ 机器人
│   │   └── websocket/     # WebSocket 服务
│   ├── database/          # 数据库脚本
│   ├── proto/             # Protobuf 协议文件
│   └── .env.example       # 环境变量模板
├── web/                   # 前端应用
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── views/         # 页面组件
│   │   └── router/        # 路由配置
│   └── package.json
└── tools/                 # 辅助工具
```

## 🚀 快速开始

### 前置要求

- Node.js 16.x 或更高版本
- MySQL 5.7 或 8.0
- npm 或 yarn

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/shihaoya/douyin-live.git
cd douyin-live
```

#### 2. 配置数据库

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE douyin_live DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入数据结构
cd server/database
mysql -u root -p douyin_live < init.sql
mysql -u root -p douyin_live < create_value_mappings.sql
```

#### 3. 配置后端

```bash
cd server

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，配置数据库和抖音 Cookie
vim .env
```

**.env 配置示例：**

```bash
# 服务器配置
PORT=5678

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=douyin_live
DB_PORT=3306

# 抖音配置（从浏览器获取 Cookie）
DOUYIN_COOKIE=your_douyin_cookie_here

# QQ 机器人配置（可选）
QQ_BOT_APP_ID=your_app_id
QQ_BOT_APP_SECRET=your_app_secret
QQ_BOT_USER_ID=your_openid
```

#### 4. 配置前端

```bash
cd ../web

# 安装依赖
npm install
```

#### 5. 启动服务

**开发模式：**

```bash
# 启动后端（终端 1）
cd server
npm run dev

# 启动前端（终端 2）
cd web
npm run dev
```

**生产模式：**

```bash
# 构建前端
cd web
npm run build

# 使用 PM2 启动后端
cd ../server
pm2 start ecosystem.config.js
```

## 📖 使用说明

### 1. 添加直播间

1. 访问 `http://localhost:5173`（开发模式）或你的服务器地址
2. 进入"直播间管理"页面
3. 点击"添加直播间"
4. 输入直播间 ID 或主播 UID
5. 保存后系统会自动开始监控

### 2. 查看实时消息

1. 进入"消息列表"页面
2. 选择要查看的直播间
3. 实时显示弹幕、礼物、点赞等消息

### 3. 配置 QQ 机器人通知

1. 在 QQ 开放平台创建应用
2. 获取 AppID 和 AppSecret
3. 配置到 `.env` 文件
4. 在 Web 界面点击"刷新 QQ OpenID"
5. 给机器人发送任意消息获取 OpenID
6. 系统会自动发送测试消息验证

### 4. 查看统计数据

1. 进入"统计分析"页面
2. 选择时间范围和直播间
3. 查看观众趋势、礼物统计等数据

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| PORT | 服务器端口 | 是 |
| DB_HOST | 数据库主机 | 是 |
| DB_USER | 数据库用户 | 是 |
| DB_PASSWORD | 数据库密码 | 是 |
| DB_NAME | 数据库名称 | 是 |
| DOUYIN_COOKIE | 抖音 Cookie | 是 |
| QQ_BOT_APP_ID | QQ 应用 ID | 否 |
| QQ_BOT_APP_SECRET | QQ 应用密钥 | 否 |
| QQ_BOT_USER_ID | 用户 OpenID | 否 |

### 开播监听配置

在 `.env` 中可以调整监听参数：

```bash
# 检查间隔（毫秒），默认 60 秒
MONITOR_CHECK_INTERVAL=60000

# 重启冷却时间（毫秒），默认 5 分钟
MONITOR_RESTART_COOLDOWN=300000
```

## 🌐 部署指南

详细部署文档请参考：

- [Linux 部署指南](./LINUX_DEPLOYMENT.md)
- [Docker 部署指南](./DOCKER_DEPLOYMENT.md)
- [部署方案对比](./DEPLOYMENT_GUIDE.md)

### 快速部署（Linux）

```bash
# 使用自动化脚本
sudo bash deploy.sh
```

### Docker 部署

```bash
docker-compose up -d
```

## 🛡️ 安全说明

### ⚠️ 重要提示

1. **不要提交 `.env` 文件到 Git** - 已配置 `.gitignore` 自动忽略
2. **定期更换抖音 Cookie** - Cookie 会过期，需要定期更新
3. **保护敏感信息** - 不要在公开场合分享你的 AppSecret
4. **使用强密码** - 数据库密码应使用强密码

### 敏感文件

以下文件已被 `.gitignore` 排除：
- `.env` - 环境变量（包含密钥）
- `node_modules/` - 依赖包
- `logs/` - 日志文件
- `qqbot_openid.json` - OpenID 数据

## 📝 API 文档

### 主要接口

#### 直播间管理

```
GET    /api/rooms          # 获取直播间列表
POST   /api/rooms          # 添加直播间
PUT    /api/rooms/:id      # 更新直播间
DELETE /api/rooms/:id      # 删除直播间
```

#### 消息查询

```
GET    /api/messages       # 获取消息列表
GET    /api/messages/stats # 获取消息统计
```

#### 礼物管理

```
GET    /api/gifts          # 获取礼物列表
POST   /api/gifts/sync     # 同步礼物数据
```

#### QQ 机器人

```
POST   /api/qqbot/refresh-openid  # 刷新 OpenID
POST   /api/qqbot/test-message    # 发送测试消息
GET    /api/qqbot/config          # 获取配置
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [DouyinLiveRecorder](https://github.com/ihmily/DouyinLiveRecorder) - 抖音直播录制项目
- [DouyinLiveWebFetcher](https://github.com/skmcj/DouyinLiveWebFetcher) - 抖音直播网页端抓取
- [Protobuf.js](https://github.com/protobufjs/protobuf.js) - Protobuf 解析库

## 📞 联系方式

- GitHub: [@shihaoya](https://github.com/shihaoya)
- Issues: [提交问题](https://github.com/shihaoya/douyin-live/issues)

---

**⭐ 如果这个项目对你有帮助，请给它一个 Star！**
