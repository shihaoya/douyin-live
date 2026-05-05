# WebSocket监听功能测试指南

## 📋 功能说明

已实现WebSocket服务器，提供以下接口：

```
ws://localhost:5678/douyin-live/:roomId
```

例如：
```
ws://localhost:5678/douyin-live/516466932480
```

## 🚀 测试步骤

### 方法1：使用测试页面（推荐）

1. **确保服务正在运行**
   ```bash
   npm run dev
   ```

2. **打开测试页面**
   
   在浏览器中打开：
   ```
   file:///c:/Users/hao/Desktop/ai/douyin-live/douyin-live/server/test-websocket.html
   ```
   
   或者将文件拖到浏览器中打开。

3. **输入直播间ID并连接**
   - 在"直播间ID"输入框中输入抖音直播间ID
   - 点击"连接"按钮
   - 观察状态和消息列表

### 方法2：使用JavaScript代码

```javascript
const ws = new WebSocket('ws://localhost:5678/douyin-live/516466932480');

ws.onopen = () => {
  console.log('✅ 连接成功');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 收到消息:', data);
  
  // 系统消息
  if (data.type === 'system') {
    console.log('系统事件:', data.event, data.message);
  }
  // 直播消息
  else {
    console.log('直播消息:', data);
  }
};

ws.onclose = (event) => {
  console.log('❌ 连接关闭', event.code, event.reason);
};

ws.onerror = (error) => {
  console.error('⚠️ 连接错误:', error);
};
```

### 方法3：使用Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5678/douyin-live/516466932480');

ws.on('open', () => {
  console.log('✅ 连接成功');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 收到消息:', message);
});

ws.on('close', (code, reason) => {
  console.log('❌ 连接关闭', code, reason.toString());
});

ws.on('error', (error) => {
  console.error('⚠️ 连接错误:', error.message);
});
```

## 📊 消息格式

### 系统消息

**连接成功**
```json
{
  "type": "system",
  "event": "connected",
  "roomId": "516466932480",
  "message": "已成功连接到抖音直播间"
}
```

**连接断开**
```json
{
  "type": "system",
  "event": "disconnected",
  "roomId": "516466932480",
  "code": 1000,
  "reason": "Normal Closure"
}
```

**错误消息**
```json
{
  "type": "system",
  "event": "error",
  "roomId": "516466932480",
  "message": "错误描述"
}
```

**欢迎消息**
```json
{
  "type": "system",
  "event": "welcome",
  "roomId": "516466932480",
  "message": "已连接到直播间 516466932480",
  "timestamp": 1712822400000
}
```

### 直播消息

目前返回的是原始Buffer数据（Base64编码），后续会实现Protobuf解析：

```json
{
  "roomId": "516466932480",
  "rawData": "<Buffer>",
  "timestamp": 1712822400000
}
```

## ⚠️ 注意事项

### 1. 直播间ID获取

直播间ID可以从抖音直播URL中获取：
```
https://live.douyin.com/516466932480
                          ^^^^^^^^^^^^
                          这就是直播间ID
```

### 2. WebSocket URL格式

必须是：
```
ws://localhost:5678/douyin-live/直播间ID
```

路径格式固定，不能修改。

### 3. 当前限制

- ✅ WebSocket连接已实现
- ✅ 自动重连机制已实现
- ✅ 心跳保活已实现
- ⚠️ Protobuf消息解析尚未完成（返回原始数据）
- ⚠️ 消息存储尚未集成

### 4. Cookie配置

如果某些直播间无法连接，可能需要在 `.env` 中配置Cookie：

```env
DOUYIN_COOKIE=your_cookie_here
```

获取Cookie的方法：
1. 浏览器打开 https://live.douyin.com
2. 登录抖音账号
3. F12打开开发者工具
4. Network标签页
5. 复制任意请求的Cookie头

## 🔧 常见问题

### Q1: 连接失败怎么办？

检查：
1. 服务是否正常运行（http://localhost:5678/health）
2. 直播间ID是否正确
3. 直播间是否正在直播
4. 防火墙是否阻止了5678端口

### Q2: 收不到消息？

可能原因：
1. 直播间未开播
2. Cookie失效（如果需要）
3. 抖音协议变化（需要更新代码）

### Q3: 如何查看日志？

日志文件位于：
```
server/logs/combined.log
server/logs/error.log
```

或者在控制台直接查看（开发模式）。

## 📝 下一步计划

1. ✅ WebSocket服务器基础框架
2. ✅ 自动重连机制
3. ✅ 心跳保活
4. ⏳ Protobuf消息解析
5. ⏳ 消息存储到数据库
6. ⏳ 消息类型映射和过滤

## 💡 技术实现

- **WebSocket库**: ws
- **连接管理**: 支持多直播间并发
- **重连策略**: 指数退避，最多10次
- **心跳间隔**: 30秒
- **消息转发**: 广播给所有连接的客户端

---

**测试愉快！** 🎉
