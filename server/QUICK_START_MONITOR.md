# 🎯 开播自动监听功能 - 快速上手

## ✨ 核心功能

系统会**自动检查**配置的直播间是否开播，检测到开播时**自动启动 WebSocket 监听**，确保不错过任何直播消息。

---

## 🚀 三步开始使用

### 1️⃣ 添加直播间到监控列表

```bash
curl -X POST http://localhost:5678/api/rooms/79209611563/start \
  -H "Content-Type: application/json" \
  -d '{"roomName": "主播名称"}'
```

### 2️⃣ 启动服务器（监听器自动启动）

```bash
cd douyin-live/server
npm start
```

你会看到日志：
```
🔍 开播监听器已自动启动，将定期检查直播间状态
```

### 3️⃣ 等待开播提醒

当主播开播时，系统会自动：
- ✅ 检测到开播状态
- ✅ 启动 WebSocket 监听
- ✅ 记录日志并发送通知

日志示例：
```
🎉 检测到直播间 79209611563 (主播名) 已开播！
   标题: 直播标题
   主播: 主播名
   观众: 1000
✅ 已自动启动直播间 79209611563 的WebSocket监听
```

---

## 📡 常用 API

### 查看监听器状态
```bash
curl http://localhost:5678/api/rooms/monitor/status
```

### 手动启停监听器
```bash
# 启动
curl -X POST http://localhost:5678/api/rooms/monitor/start

# 停止
curl -X POST http://localhost:5678/api/rooms/monitor/stop
```

### 查看所有直播间
```bash
curl http://localhost:5678/api/rooms
```

---

## 🔧 配置说明

### 检查间隔
默认每 **60秒** 检查一次，可在 `server.js` 中修改：

```javascript
const monitor = new LiveMonitor({
  checkInterval: 60000  // 毫秒，可改为 30000（30秒）等
});
```

### 监控哪些直播间
只有满足以下条件的直播间会被检查：
- `is_active = TRUE` （激活状态）
- `deleted_at IS NULL` （未删除）

---

## 📂 相关文件

| 文件 | 说明 |
|------|------|
| `src/utils/LiveMonitor.js` | 开播监听器核心实现 |
| `src/controllers/RoomController.js` | API 控制器（新增3个方法） |
| `src/routes/rooms.js` | 路由配置（新增3个路由） |
| `src/server.js` | 服务器启动时自动初始化监听器 |
| `test-monitor-api.js` | API 测试脚本 |
| `LIVE_MONITOR_GUIDE.md` | 详细使用文档 |

---

## 🧪 测试

运行完整测试：
```bash
node test-monitor-api.js
```

测试内容：
- ✅ 启动/停止监听器
- ✅ 获取状态
- ✅ 添加直播间
- ✅ 观察自动检测（60秒）

---

## 💡 优势对比

### ❌ 之前的方式
- 需要手动启动每个直播间的监听
- 如果未开播就启动，开播后可能收不到消息
- 需要人工判断何时启动监听

### ✅ 现在的方式
- **全自动**：检测到开播立即启动监听
- **零遗漏**：开播瞬间开始接收消息
- **智能管理**：自动跟踪所有直播间状态

---

## ⚠️ 注意事项

1. **检查间隔**建议 ≥ 30秒，避免频繁调用 API
2. 直播间需先通过 API 添加到监控列表
3. 确保数据库配置正确（`is_active = TRUE`）
4. 网络波动可能导致某次检查失败，不影响后续检查

---

## 🎉 开始使用吧！

1. 启动服务器
2. 添加要监控的直播间
3. 等待开播提醒
4. 享受自动化带来的便利！

**详细说明请查看 [LIVE_MONITOR_GUIDE.md](./LIVE_MONITOR_GUIDE.md)**
