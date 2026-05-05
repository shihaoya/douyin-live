# 常见问题与解决方案

## ❌ 问题1: WebSocket连接失败 - "Unexpected server response: 200"

### 症状
```
error: ❌ 直播间 XXXXX WebSocket错误: Unexpected server response: 200
warn: ⚠️ 直播间 XXXXX 连接关闭 (code: 1006, reason: )
```

### 原因
抖音服务器返回HTTP 200而不是WebSocket升级响应，说明**签名验证失败**。

可能原因：
1. signature参数不正确
2. sign.js未正确执行
3. MD5参数计算错误

### 解决方案

#### 方案1: 检查sign.js是否正确加载（推荐）

确认以下文件存在：
```
server/src/utils/sign.js
```

检查日志中是否有：
```
info: Protobuf定义加载成功
debug: MD5参数: xxxxx
debug: 生成签名: xxxxx...
```

如果没有看到"生成签名"的日志，说明sign.js执行失败。

#### 方案2: 检查vm2依赖

确保已安装vm2：
```bash
npm install vm2
```

#### 方案3: 查看完整错误日志

在 `DouyinWebSocket.js` 的 `generateSignature()` 方法中添加更多日志：

```javascript
logger.debug('sign.js路径:', signPath);
logger.debug('sign.js存在:', fs.existsSync(signPath));
logger.debug('MD5参数:', md5Param);
```

#### 方案4: 临时使用简化签名（不推荐）

如果sign.js无法执行，可以临时修改代码直接使用MD5：

```javascript
async generateSignature(wss) {
  // ... 省略参数提取代码 ...
  return crypto.createHash('md5').update(paramString).digest('hex');
}
```

**注意**: 简化签名成功率较低，仅用于测试。

---

## ❌ 问题2: Protobuf加载失败

### 症状
```
error: 加载Protobuf定义失败: ENOENT: no such file or directory
```

### 原因
proto文件路径错误或文件不存在

### 解决方案

确认文件存在：
```
server/proto/douyin.proto
```

检查路径：
```javascript
const protoPath = path.join(__dirname, '../../proto/douyin.proto');
```

---

## ❌ 问题3: 无法获取ttwid

### 症状
```
error: 未找到ttwid
```

### 原因
网络请求失败或抖音反爬

### 解决方案

1. 检查网络连接
2. 添加User-Agent
3. 重试几次（可能是临时问题）

---

## ❌ 问题4: room_id提取失败

### 症状
```
warn: 未从HTML中提取到room_id，使用: XXXXX
```

### 原因
抖音页面结构变化或正则表达式不匹配

### 解决方案

这是**正常警告**，系统会使用传入的roomId作为备选，不影响功能。

---

## ❌ 问题5: 消息解析失败

### 症状
```
error: 解码PushFrame失败: xxx
error: 解码Response失败: xxx
```

### 原因
1. Proto定义不完整
2. 数据格式变化
3. gzip解压失败

### 解决方案

1. 更新douyin.proto文件
2. 检查pako库是否正常
3. 查看原始数据进行调试

---

## 🔧 调试技巧

### 1. 启用详细日志

修改 `config/logger.js`，将级别设置为 `debug`：

```javascript
level: 'debug'  // 原来是 'info'
```

### 2. 查看原始WebSocket数据

在 `handleMessage()` 中添加：

```javascript
logger.debug('原始数据长度:', data.length);
logger.debug('原始数据(hex):', data.toString('hex').substring(0, 100));
```

### 3. 测试单个组件

```javascript
// 测试签名生成
const ws = new DouyinWebSocket('test');
const sig = await ws.generateSignature('wss://...');
console.log('签名:', sig);

// 测试ttwid获取
await ws.getTtwid();
console.log('ttwid:', ws.ttwid);
```

### 4. 使用Wireshark抓包

对比Python项目和Node.js项目的网络请求，找出差异。

---

## 📊 性能优化建议

### 1. 减少重连次数

```javascript
maxReconnectAttempts: 5  // 默认10次
reconnectInterval: 10000  // 默认5秒，改为10秒
```

### 2. 缓存签名结果

对于同一个直播间，signature可以复用一段时间。

### 3. 批量处理消息

不要每条消息都立即存储，可以批量插入数据库。

---

## 🆘 获取帮助

如果以上方案都无法解决问题：

1. 查看完整日志文件：`server/logs/combined.log`
2. 检查Python项目是否能正常工作
3. 对比两个实现的差异
4. 提交Issue并附上日志

---

**最后更新**: 2026-04-11
