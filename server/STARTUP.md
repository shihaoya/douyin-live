# 启动说明

## 📋 系统架构

```
浏览器客户端 (测试页面)
    ↓ WebSocket: ws://localhost:5678/douyin-live/:roomId
Node.js后端服务器 (端口5678) ← 纯Node.js实现，直接连接抖音
    ↓ wss://webcast*.douyin.com/...
抖音直播服务器
```

**特点**：
- ✅ 纯Node.js实现，不依赖其他程序
- ✅ 自动获取ttwid和room_id
- ✅ Protobuf消息解析
- ✅ 自动签名生成

## 🚀 启动步骤

### 1. 安装依赖

```bash
cd c:\Users\hao\Desktop\ai\douyin-live\douyin-live\server
npm install
```

### 2. 启动 Node.js后端服务

```bash
npm run dev
```

服务会显示：
```
✅ 数据库连接成功
Protobuf定义加载成功
========================================
服务器已启动！
访问地址: http://localhost:5678
健康检查: http://localhost:5678/health
环境: development
========================================
WebSocket服务器已启动，监听路径: /douyin-live/:roomId
```

### 3. 测试WebSocket连接

打开测试页面：
```
c:\Users\hao\Desktop\ai\douyin-live\douyin-live\server\test-websocket.html
```

在浏览器中：
1. 输入直播间ID（例如：516466932480）
2. 点击"连接"按钮
3. 观察消息列表

## ⚠️ 注意事项

### 启动顺序

只需启动Node.js服务即可，无需其他程序！

```bash
npm run dev
```

### 端口占用

- **5678**: Node.js后端API + WebSocket
- **5679**: 前端Vue项目（后续开发）

如果端口被占用，修改 `.env` 文件中的 `PORT` 配置。

### 直播间ID获取

从抖音直播URL中提取：
```
https://live.douyin.com/516466932480
                          ^^^^^^^^^^^^
                          这就是直播间ID
```

## 🔧 故障排查

### 问题1: Protobuf加载失败

**原因**: proto文件路径错误  
**解决**: 确认 `proto/douyin.proto` 文件存在

### 问题2: 连接抖音失败

**可能原因**:
1. 直播间未开播
2. 直播间ID错误
3. 网络连接问题
4. 签名生成失败

**检查方法**:
- 查看日志：`server/logs/combined.log`
- 确认ttwid获取成功
- 确认room_id获取成功

## 📝 引用记录

本项目完全基于以下开源项目实现：

### 1. DouyinLiveWebFetcher-main
**来源**: `project/DouyinLiveWebFetcher-main/`  
**引用时间**: 2026-04-11  
**用途**: 核心实现逻辑

#### 引用的关键部分：
- **liveMan.py (行238-275)**: WebSocket连接逻辑、wss URL构建
- **liveMan.py (行134-197)**: ttwid和room_id获取
- **liveMan.py (行277-290)**: 心跳包发送机制
- **liveMan.py (行299-338)**: Protobuf消息解析流程
- **sign.js**: 签名生成算法（已复制到src/utils目录）
- **protobuf/douyin.proto**: Protobuf协议定义（已复制到proto目录）

详见: `REFERENCES.md`

---

**祝使用愉快！** 🎉
