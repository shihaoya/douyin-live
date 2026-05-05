# 抖音WebSocket连接修复说明

## 问题描述

用户反馈："我试了，同样的房间，python脚本可以，go脚本可以，就你写的不可以"

Node.js实现只能收到心跳包（payloadType: "hb"），但收不到实际的直播消息（弹幕、礼物等）。

## 根本原因

**user_unique_id (pushId) 生成方式错误**

### Python实现 (DouyinLiveWebFetcher-main/liveMan.py)
```python
# 行251-255: 使用固定的ID
wss_push_did:7319483754668557238
...
user_unique_id=7319483754668557238
```

### Go实现 (douyinLive-main/douyin.go)
```go
// 行57: 从HTML中提取真实的pushID
pushIDRegex = regexp.MustCompile(`user_unique_id\\":\\"(\d+)\\"`)

// 行368: 提取pushID
dl.pushID = extractString(pushIDRegex, body, 1)

// 行507-519: 在wss URL中使用真实的pushID
signature := jsScript.ExecuteJS(utils.GetxMSStub(
    utils.NewOrderedMap(dl.roomID, dl.pushID),
))
return fmt.Sprintf(wssURLTemplate,
    parsedBrowser,
    dl.roomID,
    dl.pushID,      // ← 使用真实的pushID
    fetchTime,
    fetchTime,
    fetchTime,
    dl.pushID,      // ← 使用真实的pushID
    dl.roomID,
    signature,
)
```

### Node.js原始实现（错误）
```javascript
// 使用随机生成的ID - 这是错误的！
const userUniqueId = this.generateRandomId();
```

## 修复方案

### 1. 添加pushId属性
```javascript
constructor(roomId, options = {}) {
  // ...
  this.pushId = null; // user_unique_id，从HTML中提取
}
```

### 2. 从HTML中提取pushId
参考Go项目的正则表达式 `user_unique_id\\":\\"(\d+)\\"`：

```javascript
async getRoomId() {
  const html = await this.getPageContent();
  
  // 提取room_id
  const roomPatterns = [
    /roomId\\?":\\?"(\d+)"/,
    /"room_id":\s*"(\d+)"/,
    /room_id=(\d+)/,
    /"roomId":"(\d+)"/
  ];
  
  for (const pattern of roomPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      this.actualRoomId = match[1];
      break;
    }
  }
  
  // 提取push_id (user_unique_id) - 新增
  const pushPatterns = [
    /user_unique_id\\?":\\?"(\d+)"/,
    /"user_unique_id":\s*"(\d+)"/,
    /user_unique_id=(\d+)/
  ];
  
  for (const pattern of pushPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      this.pushId = match[1];
      logger.info(`✅ 从HTML中提取到push_id: ${this.pushId}`);
      break;
    }
  }
  
  // 如果没找到push_id，使用默认值（参考Python项目）
  if (!this.pushId) {
    this.pushId = '7319483754668557238';
    logger.warn(`⚠️ 未从HTML中提取到push_id，使用默认值: ${this.pushId}`);
  }
}
```

### 3. 在wss URL中使用真实的pushId
```javascript
async buildWssUrl() {
  const roomId = this.actualRoomId || this.roomId;
  const pushId = this.pushId || '7319483754668557238';  // 使用真实或默认的pushId
  const timestamp = Date.now();
  
  let wss = `wss://webcast100-ws-web-lq.douyin.com/webcast/im/push/v2/?app_name=douyin_web` +
    `&version_code=180800&webcast_sdk_version=1.0.14-beta.0` +
    // ... 其他参数 ...
    `&internal_ext=internal_src:dim|wss_push_room_id:${roomId}|wss_push_did:${pushId}|...` +
    `&user_unique_id=${pushId}&im_path=/webcast/im/fetch/&identity=audience` +
    // ... 其他参数 ...
}
```

## 测试方法

### 方法1: 使用测试脚本
```bash
cd douyin-live/server
node test-websocket.js <直播间ID>
```

例如：
```bash
node test-websocket.js 261378947940
```

### 方法2: 启动完整服务
```bash
npm start
```

然后前端连接：
```
ws://localhost:5678/douyin-live/<直播间ID>
```

## 预期结果

修复后应该能看到：

```
✅ 从HTML中提取到room_id: 7496234567890123456
✅ 从HTML中提取到push_id: 7319483754668557238
✅ 直播间 261378947940 连接成功
📊 连接信息: {
  roomId: '7496234567890123456',
  pushId: '7319483754668557238',
  ttwid: '1f7e8d9c0b1a2...'
}
✅ gzip解压成功 | 原始:123bytes -> 解压后:456bytes
✅ Response解析成功 | 消息数量: 5
📨 收到消息类型: WebcastChatMessage
💬 [用户名] 这是一条弹幕
📨 收到消息类型: WebcastGiftMessage
🎁 [用户名] 送出 玫瑰 x10
```

## 关键差异对比

| 项目 | Python | Go | Node.js (修复前) | Node.js (修复后) |
|------|--------|----|------------------|------------------|
| room_id来源 | HTML提取 | HTML提取 | HTML提取 | HTML提取 |
| push_id来源 | 硬编码固定值 | HTML提取 | **随机生成❌** | HTML提取✅ |
| wss域名 | webcast100-ws-web-lq | webcast5-ws-web-lf | webcast100-ws-web-lq | webcast100-ws-web-lq |
| 签名算法 | sign.js (MiniRacer) | jsScript.ExecuteJS | sign.js (vm2) | sign.js (vm2) |

## 引用来源

- **DouyinLiveWebFetcher-main/liveMan.py**: 
  - `_connectWebSocket()` 方法 (行238-275)
  - `generateSignature()` 函数 (行58-90)
  
- **douyinLive-main/douyin.go**:
  - `fetchRoomInfo()` 方法 (行361-377) - pushID提取逻辑
  - `buildWebsocketURL()` 方法 (行496-521) - wss URL构建
  - 正则表达式定义 (行56-57)

## 注意事项

1. **push_id的重要性**: push_id是抖音服务器识别客户端身份的关键标识，使用错误的ID会导致服务器不推送实际消息。

2. **HTML提取失败的处理**: 如果无法从HTML中提取push_id，使用Python项目中的默认值 `7319483754668557238` 作为备选。

3. **日志级别**: 测试时建议将日志级别设置为 `debug`，可以看到详细的连接和消息处理过程。

4. **直播间状态**: 确保测试的直播间正在直播，否则可能收不到消息。
