const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const DouyinWebSocket = require('./DouyinWebSocket');
const logger = require('../config/logger');

/**
 * WebSocket服务器
 * 提供 ws://localhost:5678/douyin-live/:roomId 接口
 */
class WebSocketServer {
  constructor(server, options = {}) {
    this.server = server;
    this.wss = null;
    this.clients = new Map(); // roomId -> DouyinWebSocket实例
    this.connectedClients = new Map(); // ws -> {roomId}
    
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.cookie = options.cookie || '';
  }

  /**
   * 启动WebSocket服务器（支持简单测试）
   */
  start() {
    this.wss = new WebSocket.Server({ 
      noServer: true,
      maxPayload: 10 * 1024 * 1024 // 10MB
    });

    // 处理升级请求
    this.server.on('upgrade', (request, socket, head) => {
      const pathname = require('url').parse(request.url).pathname;
      
      // 匹配 /douyin-live/:roomId 路径
      const match = pathname.match(/^\/douyin-live\/(.+)$/);
      
      if (match) {
        const roomId = match[1];
        logger.info(`收到WebSocket连接请求，直播间ID: ${roomId}`);
        
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request, roomId);
        });
      } else {
        // 不是我们的路径，拒绝连接
        socket.destroy();
      }
    });

    // 处理连接
    this.wss.on('connection', (ws, request, roomId) => {
      this.handleClientConnection(ws, roomId);
    });

    logger.info(`WebSocket服务器已启动，监听路径: /douyin-live/:roomId`);
  }

  /**
   * 处理客户端连接（简单测试用）
   */
  handleClientConnection(ws, roomId) {
    logger.info(`📱 WebSocket客户端连接到直播间 ${roomId}`);
    
    // 保存客户端连接
    this.connectedClients.set(ws, { roomId });
    
    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'system',
      event: 'welcome',
      message: `已连接到直播间 ${roomId}，消息将实时推送`,
      timestamp: Date.now()
    }));
    
    // 检查是否已经存在该直播间的抖音连接
    if (!this.clients.has(roomId)) {
      // 创建新的抖音WebSocket连接
      const douyinWs = new DouyinWebSocket(roomId, {
        maxReconnectAttempts: this.maxReconnectAttempts,
        reconnectInterval: this.reconnectInterval,
        cookie: this.cookie  // 传递cookie
      });
      
      // 设置消息回调 - 转发给所有连接的客户端
      douyinWs.onMessage = (message) => {
        this.broadcastToRoom(roomId, message);
      };
      
      douyinWs.onConnected = (connectedRoomId) => {
        logger.info(`✅ 直播间 ${connectedRoomId} 已成功连接抖音`);
        this.broadcastToRoom(connectedRoomId, {
          type: 'system',
          event: 'connected',
          message: '已成功连接到抖音直播间'
        });
      };
      
      douyinWs.onDisconnected = (connectedRoomId, code, reason) => {
        logger.warn(`⚠️ 直播间 ${connectedRoomId} 与抖音断开连接`);
        this.broadcastToRoom(connectedRoomId, {
          type: 'system',
          event: 'disconnected',
          code: code,
          reason: reason.toString()
        });
      };
      
      douyinWs.onError = (error) => {
        logger.error('❌ 直播间 %s 发生错误: %s', roomId, error.message);
        this.broadcastToRoom(roomId, {
          type: 'system',
          event: 'error',
          message: error.message
        });
      };
      
      // 保存连接
      this.clients.set(roomId, douyinWs);
      
      // 开始连接
      douyinWs.connect();
    } else {
      logger.info(`直播间 ${roomId} 已存在连接，复用`);
      // 通知客户端已连接
      ws.send(JSON.stringify({
        type: 'system',
        event: 'connected',
        message: '直播间已在监听中'
      }));
    }
    
    // 处理客户端断开
    ws.on('close', () => {
      logger.info(`WebSocket客户端断开直播间 ${roomId} 的连接`);
      this.connectedClients.delete(ws);
      
      // 检查是否还有其它客户端连接
      let hasOtherClients = false;
      this.connectedClients.forEach((info) => {
        if (info.roomId === roomId) {
          hasOtherClients = true;
        }
      });
      
      // 如果没有其它客户端了，关闭抖音连接
      if (!hasOtherClients) {
        logger.info(`直播间 ${roomId} 没有客户端了，关闭抖音连接`);
        const douyinWs = this.clients.get(roomId);
        if (douyinWs) {
          douyinWs.disconnect();
          this.clients.delete(roomId);
        }
      }
    });
    
    // 处理客户端消息（可选）
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.info(`收到客户端消息:`, message);
      } catch (error) {
        logger.error('解析客户端消息失败:', error.message);
      }
    });
  }

  /**
   * 广播消息给直播间的所有客户端
   */
  broadcastToRoom(roomId, message) {
    const data = JSON.stringify(message);
    
    this.connectedClients.forEach((info, ws) => {
      if (info.roomId === roomId && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  /**
   * 获取所有活跃的直播间
   */
  getActiveRooms() {
    return Array.from(this.clients.keys());
  }

  /**
   * 获取直播间的客户端数量
   */
  getClientCount(roomId) {
    const clients = this.connectedClients.get(roomId);
    return clients ? clients.size : 0;
  }

  /**
   * 开始监听直播间（API调用）
   */
  async startRoom(roomId) {
    if (this.clients.has(roomId)) {
      throw new Error('该直播间已在监听中');
    }

    logger.info(`API请求：开始监听直播间 ${roomId}`);
    
    // 创建DouyinWebSocket实例
    const douyinWs = new DouyinWebSocket(roomId, {
      maxReconnectAttempts: this.maxReconnectAttempts,
      reconnectInterval: this.reconnectInterval,
      cookie: this.cookie  // 传递cookie
    });

    // 设置消息处理
    douyinWs.onMessage = (message) => {
      // 将消息转发给所有连接的客户端（如果有）
      this.broadcastToRoom(roomId, message);
    };

    douyinWs.onConnected = () => {
      logger.info(`✅ 直播间 ${roomId} 连接成功`);
    };

    douyinWs.onDisconnected = (code, reason) => {
      logger.warn(`⚠️ 直播间 ${roomId} 断开连接: code=${code}, reason=${reason}`);
    };

    douyinWs.onError = (error) => {
      logger.error('❌ 直播间 %s 错误: %s', roomId, error.message);
    };

    // 连接到抖音
    await douyinWs.connect();
    
    // 保存实例
    this.clients.set(roomId, douyinWs);
    
    logger.info(`✅ 直播间 ${roomId} 已开始监听（消息自动入库）`);
  }

  /**
   * 停止监听直播间（API调用）
   */
  async stopRoom(roomId) {
    const douyinWs = this.clients.get(roomId);
    
    if (!douyinWs) {
      throw new Error('该直播间未在监听中');
    }

    logger.info(`API请求：停止监听直播间 ${roomId}`);
    
    // 断开连接
    douyinWs.disconnect();
    
    // 清理
    this.clients.delete(roomId);
    
    logger.info(`✅ 直播间 ${roomId} 已停止监听`);
  }

  /**
   * 检查直播间是否在监听
   */
  hasRoom(roomId) {
    return this.clients.has(roomId);
  }

  /**
   * 获取直播间信息
   */
  getRoom(roomId) {
    const douyinWs = this.clients.get(roomId);
    if (!douyinWs) {
      return null;
    }
    
    return {
      roomId: douyinWs.roomId,
      status: douyinWs.isConnected ? 'connected' : 'disconnected',
      connectedAt: douyinWs.connectedAt,
      messageCount: douyinWs.messageCount || 0,
      lastMessageAt: douyinWs.lastMessageAt
    };
  }

  /**
   * 获取所有直播间信息
   */
  getAllRooms() {
    const rooms = [];
    
    for (const [roomId, douyinWs] of this.clients) {
      rooms.push({
        roomId: douyinWs.roomId,
        status: douyinWs.isConnected ? 'connected' : 'disconnected',
        connectedAt: douyinWs.connectedAt,
        messageCount: douyinWs.messageCount || 0,
        lastMessageAt: douyinWs.lastMessageAt
      });
    }
    
    return rooms;
  }

  /**
   * 关闭服务器
   */
  close() {
    logger.info('正在关闭WebSocket服务器...');
    
    // 关闭所有抖音连接
    this.clients.forEach((douyinWs, roomId) => {
      logger.info(`关闭直播间 ${roomId} 的连接`);
      douyinWs.disconnect();
    });
    
    this.clients.clear();
    this.connectedClients.clear();
    
    if (this.wss) {
      this.wss.close();
    }
    
    logger.info('WebSocket服务器已关闭');
  }
}

// 单例实例
let instance = null;

/**
 * 获取WebSocketServer单例
 */
function getInstance() {
  return instance;
}

/**
 * 设置WebSocketServer单例
 */
function setInstance(inst) {
  instance = inst;
}

module.exports = WebSocketServer;
module.exports.getInstance = getInstance;
module.exports.setInstance = setInstance;
