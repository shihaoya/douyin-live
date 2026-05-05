# 🎯 开播自动监听功能说明

## 📋 功能概述

该功能会自动检查配置的直播间是否开播，当检测到主播开播时，**自动启动 WebSocket 监听**，确保不会错过任何直播消息。

### 核心优势

✅ **无需手动启动** - 系统自动检测开播并启动监听  
✅ **避免消息丢失** - 开播瞬间即可开始接收消息  
✅ **智能状态管理** - 自动跟踪每个直播间的开播状态  
✅ **灵活配置** - 可自定义检查间隔  
✅ **API 控制** - 支持通过 API 启停监听器  

---

## 🚀 快速开始

### 1. 添加直播间到监控列表

通过 API 添加需要监控的直播间：

```bash
curl -X POST http://localhost:5678/api/rooms/{roomId}/start \
  -H "Content-Type: application/json" \
  -d '{"roomName": "主播名称"}'
```

示例：
```bash
curl -X POST http://localhost:5678/api/rooms/79209611563/start \
  -H "Content-Type: application/json" \
  -d '{"roomName": "测试主播"}'
```

### 2. 启动开播监听器

监听器会在服务器启动时**自动启动**，也可以手动控制：

```bash
# 启动监听器（可指定检查间隔，单位毫秒）
curl -X POST http://localhost:5678/api/rooms/monitor/start \
  -H "Content-Type: application/json" \
  -d '{"interval": 60000}'

# 停止监听器
curl -X POST http://localhost:5678/api/rooms/monitor/stop

# 查看监听器状态
curl http://localhost:5678/api/rooms/monitor/status
```

### 3. 查看监控状态

```bash
# 查看所有直播间
curl http://localhost:5678/api/rooms

# 查看监听器状态
curl http://localhost:5678/api/rooms/monitor/status
```

---

## 📊 工作流程

```
┌─────────────────────────────────────────────────────┐
│              服务器启动 (server.js)                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         自动启动 LiveMonitor (60秒检查一次)           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│      定期检查所有 is_active=TRUE 的直播间             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│          调用抖音 API 获取直播间状态                   │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   status == 2            status != 2
   (正在直播)              (未开播)
        │                     │
        ▼                     │
┌──────────────────┐         │
│ 检查是否已监听？  │         │
└────┬─────────┬───┘         │
     │是       │否            │
     │         ▼              │
     │  ┌──────────────┐     │
     │  │自动启动WS监听 │     │
     │  └──────┬───────┘     │
     │         │              │
     │         ▼              │
     │  ┌──────────────┐     │
     │  │发送开播通知   │     │
     │  └──────┬───────┘     │
     │         │              │
     └─────────┴──────────────┘
               │
               ▼
        继续下一轮检查...
```

---

## 🔧 配置说明

### 数据库配置

直播间配置存储在 `room_configs` 表中：

```sql
CREATE TABLE room_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id VARCHAR(50) NOT NULL UNIQUE,    -- 直播间ID
  room_name VARCHAR(200),                  -- 直播间名称
  is_active BOOLEAN DEFAULT TRUE,          -- 是否激活监控
  auto_start BOOLEAN DEFAULT TRUE,         -- 是否自动启动
  deleted_at DATETIME DEFAULT NULL,        -- 逻辑删除时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**关键字段：**
- `is_active = TRUE`: 该直播间会被监听器检查
- `auto_start = TRUE`: 服务器启动时自动恢复监听
- `deleted_at IS NULL`: 未被逻辑删除

### 监听器配置

在 `server.js` 中配置：

```javascript
const monitor = new LiveMonitor({
  checkInterval: 60000  // 检查间隔（毫秒），默认60秒
});
```

---

## 📡 API 接口

### 1. 启动开播监听器

**请求：**
```
POST /api/rooms/monitor/start
Content-Type: application/json

{
  "interval": 60000  // 可选，检查间隔（毫秒）
}
```

**响应：**
```json
{
  "code": 200,
  "message": "开播监听器已启动",
  "data": {
    "isRunning": true,
    "checkInterval": 60000,
    "monitoredRooms": []
  }
}
```

### 2. 停止开播监听器

**请求：**
```
POST /api/rooms/monitor/stop
```

**响应：**
```json
{
  "code": 200,
  "message": "开播监听器已停止"
}
```

### 3. 获取监听器状态

**请求：**
```
GET /api/rooms/monitor/status
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "isRunning": true,
    "checkInterval": 60000,
    "monitoredRooms": [
      {
        "roomId": "79209611563",
        "status": "live"
      }
    ]
  }
}
```

### 4. 添加直播间

**请求：**
```
POST /api/rooms/{roomId}/start
Content-Type: application/json

{
  "roomName": "主播名称"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "开始监听直播间成功",
  "data": {
    "roomId": "79209611563"
  }
}
```

---

## 🔍 日志说明

### 正常日志

```
[2024-01-01 12:00:00] 🔍 开播监听器已启动
[2024-01-01 12:01:00] 正在检查 3 个直播间的开播状态...
[2024-01-01 12:01:01] 🎉 检测到直播间 79209611563 (主播名) 已开播！
[2024-01-01 12:01:01]    标题: 直播标题
[2024-01-01 12:01:01]    主播: 主播名
[2024-01-01 12:01:01]    观众: 1000
[2024-01-01 12:01:02] ✅ 已自动启动直播间 79209611563 的WebSocket监听
[2024-01-01 12:01:02] 🎉 开播提醒

直播间: 主播名
标题: 直播标题
观众: 1000
房间ID: 79209611563
```

### 错误日志

```
[2024-01-01 12:01:01] ❌ 获取直播间 79209611563 信息失败: Request timeout
[2024-01-01 12:01:01] ⚠️  无法获取直播间 79209611563 的信息
```

---

## 🧪 测试

运行测试脚本验证功能：

```bash
cd douyin-live/server
node test-monitor-api.js
```

测试内容包括：
1. ✅ 启动开播监听器
2. ✅ 获取监听器状态
3. ✅ 添加直播间到监控
4. ✅ 查看所有直播间
5. ✅ 观察自动检测（等待60秒）
6. ✅ 停止监听器

---

## 💡 使用场景

### 场景1：监控多个主播

```javascript
// 批量添加直播间
const rooms = [
  { roomId: '79209611563', name: '主播A' },
  { roomId: '12345678901', name: '主播B' },
  { roomId: '98765432109', name: '主播C' }
];

for (const room of rooms) {
  await axios.post(`http://localhost:5678/api/rooms/${room.roomId}/start`, {
    roomName: room.name
  });
}
```

### 场景2：动态调整检查频率

```javascript
// 高峰期频繁检查（30秒）
await axios.post('http://localhost:5678/api/rooms/monitor/start', {
  interval: 30000
});

// 低峰期降低频率（5分钟）
await axios.post('http://localhost:5678/api/rooms/monitor/start', {
  interval: 300000
});
```

### 场景3：临时关闭监控

```javascript
// 停止监听器（不删除配置）
await axios.post('http://localhost:5678/api/rooms/monitor/stop');

// 需要时再启动
await axios.post('http://localhost:5678/api/rooms/monitor/start');
```

---

## ⚠️ 注意事项

### 1. 性能考虑

- **检查间隔**不宜过短，建议 ≥ 30秒
- 监控大量直播间时，适当增加间隔
- 每次检查会调用抖音 API，注意频率限制

### 2. 网络问题

- API 调用可能因网络波动失败
- 监听器会捕获错误并继续运行
- 建议配置合理的超时时间

### 3. 状态同步

- 监听器维护内存中的状态缓存
- 重启服务器后状态会重置
- 数据库中的 `is_active` 是权威数据源

### 4. 资源管理

- 每个监听的直播间会占用一个 WebSocket 连接
- 及时清理不再需要的直播间配置
- 使用逻辑删除而非物理删除

---

## 🔮 未来扩展

### 1. 通知集成

可以集成各种通知方式：

```javascript
// 飞书通知
await this.sendFeishuNotification(message);

// 钉钉通知
await this.sendDingTalkNotification(message);

// 邮件通知
await this.sendEmailNotification(message);

// 短信通知
await this.sendSmsNotification(message);
```

### 2. 智能调度

- 根据历史数据预测开播时间
- 在预测时间段提高检查频率
- 非活跃时段降低检查频率

### 3. 下播处理

- 检测到下播时自动停止监听
- 保存直播统计数据
- 生成直播报告

---

## 📞 技术支持

如有问题，请检查：

1. **日志文件**: `douyin-live/server/logs/combined.log`
2. **数据库状态**: 确认 `room_configs` 表配置正确
3. **网络连接**: 确保能访问抖音 API
4. **服务器状态**: 确认服务器正常运行

---

## 🎉 总结

开播自动监听功能让你的直播监控系统更加智能化：

✅ **全自动** - 无需人工干预  
✅ **零遗漏** - 开播瞬间即开始监听  
✅ **易管理** - 通过 API 轻松控制  
✅ **可扩展** - 支持多种通知方式  

**享受无忧的直播监控体验！** 🚀
