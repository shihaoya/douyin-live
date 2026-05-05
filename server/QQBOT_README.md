# QQ 机器人集成指南

## 功能说明

本项目已集成 QQ 机器人功能，支持：
- ✅ 开播自动推送通知到 QQ
- ✅ 通过 Web 界面刷新 OpenID
- ✅ 自动发送测试消息验证配置

## 配置步骤

### 1. 获取 QQ 开放平台凭证

1. 访问 [QQ 开放平台](https://q.qq.com/)
2. 创建应用并获取：
   - **AppID** (例如: `102897225`)
   - **AppSecret** (例如: `k8WvLlCe6Z3X2Y4b8gFoOyZBnQ3hM1hO`)

### 2. 配置环境变量

编辑 `.env` 文件（复制 `.env.example` 并修改）：

```bash
# QQ机器人配置
QQ_BOT_APP_ID=102897225
QQ_BOT_APP_SECRET=k8WvLlCe6Z3X2Y4b8gFoOyZBnQ3hM1hO
QQ_BOT_USER_ID=
```

> 注意：`QQ_BOT_USER_ID` 可以先留空，稍后通过 Web 界面刷新获取。

### 3. 启动事件回调服务器

在 `test` 目录下启动 QQ 机器人事件接收服务器：

```bash
cd test
node qqbot-event-server.js
```

服务器会监听 `3000` 端口，并通过 ngrok 暴露到公网。

### 4. 配置 QQ 开放平台回调地址

1. 登录 [QQ 开放平台](https://q.qq.com/)
2. 进入应用管理 → 开发设置
3. 配置消息接收 URL：
   ```
   https://your-ngrok-url.ngrok-free.dev/qqbot/event
   ```
4. 保存配置

### 5. 获取用户 OpenID

1. 用你的 QQ 号给机器人发送任意消息（例如："你好"）
2. 查看服务器日志，会显示类似这样的信息：
   ```
   🎯 获取到用户openid: 814260AB3F2B7450C4320FD86041B9A4
   💡 请将此openid复制到 config.example.js 中的 userId 字段
   ```
3. 复制这个 OpenID

### 6. 在 Web 界面刷新 OpenID

1. 访问前端页面：**直播间监控管理**
2. 点击 **"刷新QQ OpenID"** 按钮
3. 粘贴刚才复制的 OpenID
4. 点击 **"确定并发送测试消息"**
5. 如果配置成功，你会收到一条测试消息

### 7. 测试开播通知

1. 确保有直播间正在监控
2. 等待主播开播
3. 当检测到从未开播变为开播状态时，会自动发送 QQ 通知

## 技术实现

### 后端架构

- **服务模块**: `server/src/utils/qqbot.js`
  - AccessToken 管理（自动刷新）
  - 消息发送
  - OpenID 管理（文件持久化）

- **控制器**: `server/src/controllers/QQBotController.js`
  - 刷新 OpenID
  - 获取配置
  - 测试消息

- **路由**: `server/src/routes/qqbot.js`
  - `POST /api/qqbot/refresh-openid` - 刷新 OpenID
  - `GET /api/qqbot/config` - 获取当前配置
  - `POST /api/qqbot/test-message` - 测试发送消息

- **集成**: `server/src/utils/LiveMonitor.js`
  - 在 `sendNotification()` 方法中调用 QQ 通知

### 签名算法

QQ 开放平台使用 **Ed25519** 签名算法：
1. 将 AppSecret 填充到 32 字节
2. 生成 Ed25519 密钥对
3. 拼接 `event_ts + plain_token`
4. 使用 Ed25519 签名
5. 返回 hex 格式的签名

### 前端实现

- **API**: `web/src/api/qqbot.js`
- **组件**: `web/src/views/RoomManagerView.vue`
  - 添加"刷新QQ OpenID"按钮
  - 弹出对话框输入 OpenID
  - 调用 API 刷新并发送测试消息

## 常见问题

### 1. 收不到事件回调

- 检查 ngrok 是否正常运行
- 确认 QQ 开放平台的回调地址配置正确
- 检查防火墙是否允许 3000 端口

### 2. 签名验证失败

- 确认使用的是 **Ed25519** 算法（不是 HMAC-SHA256）
- 确认签名内容是 `event_ts + plain_token`（顺序不能错）
- 确认 AppSecret 正确

### 3. 消息发送失败

- 检查 AccessToken 是否过期
- 确认 OpenID 格式正确（32位十六进制字符串）
- 查看服务器日志中的错误信息

### 4. OpenID 丢失

OpenID 保存在 `server/qqbot_openid.json` 文件中，重启服务器会自动加载。

## API 文档

### 刷新 OpenID

```http
POST /api/qqbot/refresh-openid
Content-Type: application/json

{
  "openid": "814260AB3F2B7450C4320FD86041B9A4"
}
```

响应：
```json
{
  "code": 200,
  "message": "OpenID更新成功，测试消息已发送",
  "data": {
    "openid": "814260AB3F2B7450C4320FD86041B9A4"
  }
}
```

### 获取当前配置

```http
GET /api/qqbot/config
```

响应：
```json
{
  "code": 200,
  "data": {
    "openid": "814260AB3F2B7450C4320FD86041B9A4",
    "configured": true
  }
}
```

### 测试发送消息

```http
POST /api/qqbot/test-message
Content-Type: application/json

{
  "content": "这是一条测试消息"
}
```

## 依赖包

- `tweetnacl` - Ed25519 签名算法
- `axios` - HTTP 请求

安装命令：
```bash
npm install tweetnacl axios
```
