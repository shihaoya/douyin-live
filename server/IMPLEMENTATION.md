# 抖音直播WebSocket监听 - 实现说明

## 🎯 项目概述

这是一个**纯Node.js实现**的抖音直播监听系统，完全基于开源项目 `DouyinLiveWebFetcher-main` 的Python代码重写。

**不依赖任何外部程序**，直接连接抖音服务器。

---

## 📚 引用来源

### 主要参考项目
**DouyinLiveWebFetcher-main** (`project/DouyinLiveWebFetcher-main/`)

### 引用的具体文件和代码段

| 文件 | 行号 | 用途 | Node.js对应文件 |
|------|------|------|----------------|
| liveMan.py | 134-156 | ttwid获取逻辑 | DouyinWebSocket.js - getTtwid() |
| liveMan.py | 158-197 | room_id提取 | DouyinWebSocket.js - getRoomId() |
| liveMan.py | 238-275 | wss URL构建 | DouyinWebSocket.js - buildWssUrl() |
| liveMan.py | 58-90 | 签名生成算法 | DouyinWebSocket.js - generateSignature() |
| liveMan.py | 277-290 | 心跳包机制 | DouyinWebSocket.js - startHeartbeat() |
| liveMan.py | 299-338 | Protobuf消息解析 | DouyinWebSocket.js - handleMessage() |
| sign.js | 完整文件 | JavaScript签名算法 | src/utils/sign.js (已复制) |
| protobuf/douyin.proto | 完整文件 | Protobuf协议定义 | proto/douyin.proto (已复制) |

---

## 🏗️ 技术架构

### 核心流程

```
1. 获取ttwid cookie
   ↓
2. 获取room_id（从HTML中提取）
   ↓
3. 构建wss URL（包含signature签名）
   ↓
4. 建立WebSocket连接
   ↓
5. 发送心跳包（每10秒）
   ↓
6. 接收Protobuf消息
   ↓
7. gzip解压
   ↓
8. 解析PushFrame → Response → Message
   ↓
9. 根据method类型解析具体消息
   ↓
10. 转发给客户端
```

### 消息类型映射

| method | Proto类型 | 说明 |
|--------|-----------|------|
| WebcastChatMessage | ChatMessage | 弹幕消息 |
| WebcastGiftMessage | GiftMessage | 礼物消息 |
| WebcastLikeMessage | LikeMessage | 点赞消息 |
| WebcastMemberMessage | MemberMessage | 进场消息 |
| WebcastSocialMessage | SocialMessage | 关注消息 |
| WebcastControlMessage | ControlMessage | 直播间状态 |
| WebcastEmojiChatMessage | EmojiChatMessage | 表情消息 |
| ... | ... | 更多类型见proto文件 |

---

## 💻 实现细节

### 1. 依赖安装

```bash
npm install protobufjs pako ws vm2
```

- **protobufjs**: Protobuf编解码
- **pako**: gzip压缩/解压
- **ws**: WebSocket客户端/服务端
- **vm2**: 安全执行JavaScript代码（用于sign.js）

### 2. Protobuf加载

```javascript
const protobuf = require('protobufjs');
const protoRoot = await protobuf.load('proto/douyin.proto');
```

### 3. 消息解析流程

```javascript
// 1. 解码PushFrame
const pushFrame = PushFrame.decode(buffer);

// 2. gzip解压payload
const payload = pako.inflate(pushFrame.payload);

// 3. 解码Response
const response = Response.decode(payload);

// 4. 遍历messages
for (const msg of response.messagesList) {
  // 5. 根据method解析
  const Type = protoRoot.lookupType(methodMap[msg.method]);
  const data = Type.decode(msg.payload);
}
```

### 4. 签名生成

参考 `sign.js` 的实现：
1. 提取URL参数
2. MD5加密参数字符串
3. 调用JS算法生成signature

---

## 📁 文件结构

```
server/
├── src/
│   ├── websocket/
│   │   ├── DouyinWebSocket.js    # 核心实现（~400行）
│   │   └── WebSocketServer.js    # WebSocket服务器
│   └── utils/
│       └── sign.js               # 签名算法（来自Python项目）
├── proto/
│   └── douyin.proto              # Protobuf定义（来自Python项目）
├── STARTUP.md                    # 启动说明
├── REFERENCES.md                 # 引用记录
└── IMPLEMENTATION.md             # 本文档
```

---

## ⚡ 性能优化

### 1. 消息去重
使用数据库唯一索引防止重复存储

### 2. Protobuf缓存
proto定义只加载一次，后续复用

### 3. 心跳优化
10秒间隔，平衡稳定性和流量

### 4. 错误处理
完善的异常捕获和重连机制

---

## 🔍 调试技巧

### 查看原始消息

在 `handleMessage()` 中添加：
```javascript
logger.debug('原始数据:', data.toString('hex'));
```

### 查看解析后的消息

在 `processMessage()` 中添加：
```javascript
logger.debug('解析结果:', JSON.stringify(messageObj, null, 2));
```

### 测试单个直播间

```javascript
const ws = new DouyinWebSocket('516466932480');
ws.onMessage = (msg) => console.log(msg);
ws.connect();
```

---

## 🚧 已知限制

### 1. 签名算法简化
当前使用MD5作为临时方案，完整的sign.js需要MiniRacer执行环境

**解决方案**: 
- 短期：使用简化签名（可能成功率较低）
- 长期：集成vm2或worker_threads执行sign.js

### 2. Proto定义不完整
douyin.proto可能缺少某些新消息类型

**解决方案**: 从douyin_proto-main更新proto文件

### 3. 反爬机制
抖音可能更新反爬策略

**解决方案**: 定期更新user-agent和签名算法

---

## 📊 与Python版本对比

| 特性 | Python版本 | Node.js版本 |
|------|-----------|------------|
| 语言 | Python 3.7+ | Node.js 16+ |
| Protobuf | protobuf库 | protobufjs |
| gzip | zlib/gzip | pako |
| JS执行 | MiniRacer | 待集成 |
| WebSocket | websocket-client | ws |
| 性能 | 中等 | 较高（异步） |
| 部署 | 需要Python环境 | 只需Node.js |

---

## 🎓 学习要点

### 1. WebSocket协议
- 握手过程
- 二进制数据传输
- 心跳保活

### 2. Protobuf序列化
- .proto文件定义
- 编码/解码
- 嵌套消息处理

### 3. 逆向工程
- 抓包分析
- 参数提取
- 签名算法理解

### 4. 异步编程
- Promise/async-await
- 事件驱动
- 错误处理

---

## 📝 开发日志

### 2026-04-11
- ✅ 创建DouyinWebSocket.js核心类
- ✅ 实现ttwid和room_id获取
- ✅ 实现wss URL构建
- ✅ 集成Protobuf解析
- ✅ 复制sign.js和douyin.proto
- ✅ 更新启动文档
- ⏳ 完善签名算法（需要MiniRacer替代方案）

---

## 🔗 相关资源

- **原始项目**: https://github.com/saermart/DouyinLiveWebFetcher
- **Proto定义**: https://github.com/Remember-the-past/douyin_proto
- **Go实现**: https://github.com/jwwsjlm/douyinLive
- **Python录制**: https://github.com/ihmily/DouyinLiveRecorder

---

**实现完成时间**: 2026-04-11  
**参考项目版本**: DouyinLiveWebFetcher-main (最新)  
**许可证**: MIT（与原项目保持一致）
