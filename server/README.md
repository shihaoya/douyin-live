# 抖音直播监控系统 - 后端服务

## 📋 项目说明

抖音直播监控系统的Node.js后端服务，负责：
- 监听抖音直播间WebSocket消息
- 消息解析和存储
- 提供RESTful API接口

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少需要配置数据库信息：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=douyin_live
DB_PORT=3306
```

### 3. 初始化数据库

在MySQL中执行 `database/init.sql` 脚本：

```bash
mysql -u root -p < database/init.sql
```

或者手动在MySQL客户端中执行该SQL文件。

### 4. 启动服务

**开发模式**（支持热重载）：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

### 5. 验证服务

访问健康检查接口：
```
http://localhost:3000/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2026-04-11T12:00:00.000Z",
  "service": "douyin-live-server"
}
```

## 📁 项目结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   │   ├── index.js     # 主配置
│   │   ├── database.js  # 数据库配置
│   │   └── logger.js    # 日志配置
│   ├── utils/           # 工具函数
│   │   └── response.js  # 统一响应格式
│   ├── app.js           # Express应用
│   └── server.js        # 服务器入口
├── database/            # 数据库脚本
│   └── init.sql         # 初始化脚本
├── .env                 # 环境变量（不提交到Git）
├── .env.example         # 环境变量示例
├── .gitignore
├── package.json
└── README.md
```

## 🔧 技术栈

- **Express**: Web框架
- **MySQL2**: 数据库驱动
- **WS**: WebSocket客户端
- **Protobufjs**: Protobuf解析
- **Winston**: 日志系统
- **Dotenv**: 环境变量管理

## 📝 API接口

当前可用的接口：

- `GET /health` - 健康检查
- `GET /api` - API概览

更多接口将在后续开发中添加。

## ⚠️ 注意事项

1. 确保MySQL服务已启动
2. 首次运行前必须执行数据库初始化脚本
3. `.env` 文件包含敏感信息，不要提交到版本控制

## 🐛 常见问题

### 数据库连接失败

检查 `.env` 中的数据库配置是否正确，确保MySQL服务正在运行。

### 端口被占用

修改 `.env` 中的 `PORT` 配置为其他端口。

## 📄 License

ISC
