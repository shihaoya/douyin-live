# 引用记录

## 项目引用说明

本文档记录从开源项目引用的代码和实现思路。

---

### 1. DouyinLiveWebFetcher-main
**来源**: `project/DouyinLiveWebFetcher-main/`  
**引用时间**: 2026-04-11  
**用途**: 抖音直播WebSocket监听核心逻辑

#### 1.1 liveMan.py - WebSocket连接逻辑
- **文件**: `liveMan.py` (行238-275)
- **引用内容**: 
  - wss URL构建方式
  - 签名生成算法
  - 心跳包发送机制
- **用在**: `src/websocket/DouyinWebSocket.js` - getWssUrl()方法

#### 1.2 sign.js - 签名算法
- **文件**: `sign.js`
- **引用内容**: JavaScript签名算法
- **用在**: `src/utils/sign.js` - 生成signature参数

#### 1.3 a_bogus.js - ABogus签名
- **文件**: `a_bogus.js`  
- **引用内容**: a_bogus参数生成算法
- **用在**: 后续API请求签名

---

### 2. douyin_proto-main
**来源**: `project/douyin_proto-main/`  
**引用时间**: 2026-04-11  
**用途**: Protobuf消息定义

#### 2.1 douyin.proto - 协议定义
- **文件**: `douyin.proto` (完整文件)
- **引用内容**: 
  - PushFrame结构
  - Response结构
  - Message结构
  - 各种消息类型定义（ChatMessage, GiftMessage等）
- **用在**: `proto/douyin.proto` - 编译为JavaScript模块

#### 2.2 method对应proto关系.md
- **文件**: `method对应proto关系.md`
- **引用内容**: method名称与proto消息类型的映射关系
- **用在**: 消息解析时的类型判断

---

### 3. DouyinLiveRecorder-main
**来源**: `project/DouyinLiveRecorder-main/`  
**引用时间**: 2026-04-11  
**用途**: 参考直播间信息获取方式

#### 3.1 room.py - 房间信息获取
- **文件**: `src/room.py`
- **引用内容**: 如何从直播间URL提取room_id
- **用在**: 后续实现直播间信息获取

---

## 实现说明

### 当前架构决策

由于纯Node.js实现抖音直播监听需要：
1. 重写JavaScript签名算法（sign.js）
2. 编译proto文件为JavaScript模块
3. 处理gzip压缩
4. 实现复杂的握手流程

**暂时采用混合架构**：
```
浏览器客户端
    ↓ WebSocket (ws://localhost:5678/douyin-live/:roomId)
Node.js后端 (端口5678)
    ↓ WebSocket (ws://localhost:1088/ws/:roomId)  
douyinLive Go程序 (端口1088) ← 来自DouyinLiveWebFetcher的成熟实现
    ↓ WebSocket
抖音服务器
```

### 后续优化方向

1. **短期**：稳定使用douyinLive作为底层服务
2. **中期**：用Node.js重写sign.js算法，直接连接抖音
3. **长期**：完整的纯Node.js实现，移除对Go程序的依赖

---

## 许可证说明

所有引用的开源项目均遵循其原始许可证：
- DouyinLiveWebFetcher: MIT License
- douyin_proto: MIT License  
- DouyinLiveRecorder: MIT License

本项目仅用于学习和研究目的。
