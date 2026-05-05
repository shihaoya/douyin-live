const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');
const pako = require('pako');
const { VM } = require('vm2');
const db = require('../config/database');
const logger = require('../config/logger');
const { getProtoType, isSupported, getSupportedMethods } = require('../config/messageTypeMap');

/**
 * 抖音WebSocket客户端 - 纯Node.js实现
 * 
 * 引用来源: DouyinLiveWebFetcher-main/liveMan.py
 * - 完整复制了Python项目的连接逻辑
 * - 使用sign.js生成签名
 * - Protobuf消息解析
 */
class DouyinWebSocket {
  constructor(roomId, options = {}) {
    this.roomId = roomId;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.heartbeatTimer = null;
    this.ttwid = null;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';
    this.manualDisconnect = false; // 标记是否手动断开
    this.pushId = null; // user_unique_id，从HTML中提取
    this.allCookies = {}; // 存储所有cookies，参考Go项目
    this.configCookie = options.cookie || ''; // 从配置文件传入的cookie
    
    // 状态追踪
    this.connectedAt = null; // 连接时间
    this.messageCount = 0; // 消息计数
    this.lastMessageAt = null; // 最后消息时间
    
    // 事件回调
    this.onMessage = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
    
    // 加载proto文件
    this.protoRoot = null;
    this.loadProto();
  }
  
  /**
   * 加载Protobuf定义
   */
  async loadProto() {
    try {
      const protoPath = path.join(__dirname, '../../proto/douyin.proto');
      this.protoRoot = await protobuf.load(protoPath);
      logger.info('Protobuf定义加载成功');
      
      // 显示已配置的消息类型
      const supportedMethods = getSupportedMethods();
      logger.info(`✅ 已配置 ${supportedMethods.length} 种消息类型`);
      logger.debug('支持的消息类型: %s', supportedMethods.join(', '));
    } catch (error) {
      logger.error('加载Protobuf定义失败: %s', error.message);
    }
  }

  /**
   * 连接到抖音直播间
   * 引用: liveMan.py _connectWebSocket() 方法 (行238-275)
   */
  async connect() {
    try {
      logger.info(`正在连接直播间 ${this.roomId}...`);
      
      // 1. 获取ttwid
      await this.getTtwid();
      
      // 2. 获取room_id
      await this.getRoomId();
      
      // 3. 构建wss URL
      const wssUrl = await this.buildWssUrl();
      logger.info(`WSS URL: ${wssUrl.substring(0, 150)}...`);
      
      // 4. 建立WebSocket连接
      this.ws = new WebSocket(wssUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Cookie': this.getCookieString()  // 使用所有cookies
        }
      });
      
      // 5. 绑定事件
      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data) => this.handleMessage(data).catch(err => logger.error('处理消息错误:', err)));
      this.ws.on('close', (code, reason) => this.handleClose(code, reason));
      this.ws.on('error', (error) => this.handleError(error));
      
    } catch (error) {
      logger.error(`连接直播间 ${this.roomId} 失败: %s`, error.message);
      if (this.onError) {
        this.onError(error);
      }
      this.reconnect();
    }
  }
  
  /**
   * 获取ttwid cookie和所有其他cookies
   * 引用: douyinLive-main/douyin.go fetchTTWID() (行329-358)
   */
  getTtwid() {
    return new Promise((resolve, reject) => {
      if (this.ttwid) {
        resolve(this.ttwid);
        return;
      }
      
      const options = {
        hostname: 'live.douyin.com',
        path: '/',
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent
        }
      };
      
      https.get(options, (res) => {
        const cookies = res.headers['set-cookie'];
        if (cookies) {
          // 解析所有cookies
          for (const cookie of cookies) {
            const match = cookie.match(/([^=]+)=([^;]+)/);
            if (match) {
              const name = match[1];
              const value = match[2];
              this.allCookies[name] = value;
              
              if (name === 'ttwid') {
                this.ttwid = value;
                logger.info(`✅ 获取到ttwid: ${this.ttwid.substring(0, 20)}...`);
              }
            }
          }
          
          // 如果配置文件中有cookie，解析并合并
          if (this.configCookie) {
            this.parseConfigCookie();
          }
          
          logger.info(`✅ 共获取到 ${Object.keys(this.allCookies).length} 个cookies`);
          logger.debug('Cookies: %s', Object.keys(this.allCookies).join(', '));
          
          if (this.ttwid) {
            resolve(this.ttwid);
            return;
          }
        }
        reject(new Error('未找到ttwid'));
      }).on('error', reject);
    });
  }
  
  /**
   * 解析配置文件中的cookie字符串
   */
  parseConfigCookie() {
    try {
      // cookie格式: name1=value1; name2=value2; ...
      const cookiePairs = this.configCookie.split(';');
      let addedCount = 0;
      
      for (const pair of cookiePairs) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) continue;
        
        const name = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        
        if (name && value) {
          // 配置文件的cookie优先级更高，覆盖自动获取的
          this.allCookies[name] = value;
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        logger.info(`✅ 从配置文件添加了 ${addedCount} 个cookies`);
      }
    } catch (error) {
      logger.error('解析配置文件cookie失败: %s', error.message);
    }
  }
  
  /**
   * 获取room_id和push_id
   * 引用: douyinLive-main/douyin.go fetchRoomInfo() (行361-377)
   */
  async getRoomId() {
    try {
      // 获取直播间页面内容
      const html = await this.getPageContent();
          
      if (!html) {
        throw new Error('无法获取直播间页面');
      }
        
      // 检查是否是风控页面
      if (html.includes('验证后继续访问') || 
          html.includes('请输入验证码') ||
          html.includes('访问过于频繁')) {
        throw new Error('检测到页面风控或验证，请稍后重试');
      }
          
      // 提取room_id - 使用与Python项目完全相同的正则
      const roomPatterns = [
        /roomId\\":\\"(\d+)\\"/,  // roomId\"123456\" (Python格式)
        /"room_id":\s*"(\d+)"/,   // "room_id": "123456"
        /room_id=(\d+)/,          // room_id=123456
        /"roomId":"(\d+)"/        // "roomId":"123456"
      ];
          
      for (const pattern of roomPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          this.actualRoomId = match[1];
          logger.info(`✅ 从HTML中提取到room_id: ${this.actualRoomId}`);
          break;
        }
      }
        
      // 提取push_id (user_unique_id) - 使用与Python项目相同的正则
      const pushPatterns = [
        /user_unique_id\\":\\"(\d+)\\"/,  // user_unique_id\"123456\" (Python格式)
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
          
      // 如果没找到room_id，使用传入的roomId
      if (!this.actualRoomId) {
        this.actualRoomId = this.roomId;
        logger.warn(`⚠️ 未从HTML中提取到room_id，使用传入的ID: ${this.actualRoomId}`);
        logger.warn('💡 可能原因:');
        logger.warn('  1. 直播间未开播');
        logger.warn('  2. 直播间ID不正确');
        logger.warn('  3. 直播间已被封禁');
        logger.warn('  4. 需要登录才能查看');
      }
        
      // 如果没找到push_id，使用默认值（参考Python项目）
      if (!this.pushId) {
        this.pushId = '7319483754668557238';
        logger.warn(`⚠️ 未从HTML中提取到push_id，使用默认值: ${this.pushId}`);
      }
        
      // 检查直播间状态
      this.checkLiveStatus(html);
          
      return this.actualRoomId;
          
    } catch (error) {
      logger.error('获取room_id失败: %s', error.message);
      this.actualRoomId = this.roomId;
      if (!this.pushId) {
        this.pushId = '7319483754668557238';
      }
      return this.actualRoomId;
    }
  }
    
  /**
   * 检查直播间状态
   * 引用: douyinLive-main/douyin.go IsLive() (行398-417)
   */
  checkLiveStatus(html) {
    try {
      // 检查是否包含直播间结束的标志
      if (html.includes('直播已结束') || 
          html.includes('主播暂未开播') ||
          html.includes('房间不存在')) {
        logger.error('❌ 直播间未开播或不存在！');
        logger.error('💡 请确认:');
        logger.error('  1. 直播间ID是否正确');
        logger.error('  2. 主播是否正在直播');
        logger.error('  3. 直播间是否被封禁');
        return false;
      }
        
      // 尝试提取直播间状态
      // 参考 Go: id_str\\":\\"(\d+)\\",\\"status\\":(\d+)
      const statusPattern = /"status":\s*(\d+)/;
      const match = html.match(statusPattern);
        
      if (match) {
        const status = parseInt(match[1]);
        if (status === 2) {
          logger.info('✅ 直播间状态: 正在直播');
          return true;
        } else if (status === 4) {
          logger.warn('⚠️ 直播间状态: 已关闭');
          return false;
        } else {
          logger.info(`ℹ️ 直播间状态码: ${status}`);
          return true; // 其他状态也尝试连接
        }
      }
        
      logger.info('ℹ️ 未能提取直播间状态，将尝试连接');
      return true;
        
    } catch (error) {
      logger.debug('检查直播间状态失败: %s', error.message);
      return true; // 出错时不阻止连接
    }
  }
    
  /**
   * 获取Cookie字符串（用于HTTP请求）
   * 引用: douyinLive-main/douyin.go getCookieString() (行315-321)
   */
  getCookieString() {
    const parts = [];
    for (const [name, value] of Object.entries(this.allCookies)) {
      parts.push(`${name}=${value}`);
    }
    return parts.join('; ');
  }
  
  /**
   * 获取直播间页面内容
   * 引用: douyinLive-main/douyin.go getPageContent() (行380-395)
   */
  getPageContent() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'live.douyin.com',
        path: `/${this.roomId}`,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Cookie': this.getCookieString()  // 使用所有cookies
        }
      };
        
      https.get(options, (res) => {
        let html = '';
        res.on('data', (chunk) => { html += chunk; });
        res.on('end', () => {
          logger.info(`📄 获取到HTML页面，长度: ${html.length} bytes`);
          
          // 检查是否是风控页面
          if (html.includes('验证后继续访问') || 
              html.includes('请输入验证码') ||
              html.includes('访问过于频繁')) {
            logger.warn('⚠️ 检测到页面风控或验证');
            resolve(html);
            return;
          }
          
          // 检查是否包含直播间信息
          const hasRoomId = html.includes('roomId');
          const hasUserId = html.includes('user_unique_id');
          logger.info(`🔍 HTML检查: contains_roomId=${hasRoomId}, contains_user_unique_id=${hasUserId}`);
          
          // 如果HTML太短，可能是错误页面
          if (html.length < 1000) {
            logger.warn('⚠️ HTML页面过短，可能不是有效的直播间页面');
            logger.info('HTML前500字符: %s', html.substring(0, 500));
          }
          
          resolve(html);
        });
      }).on('error', (err) => {
        logger.error('获取HTML页面失败:', err.message);
        reject(err);
      });
    });
  }
  
  /**
   * 构建WSS URL
   * 引用: liveMan.py _connectWebSocket() (行242-256)
   */
  async buildWssUrl() {
    const roomId = this.actualRoomId || this.roomId;
    const pushId = this.pushId || '7319483754668557238';
    const timestamp = Date.now();
    
    // 基础URL - 来自 liveMan.py 行242-256
    let wss = `wss://webcast100-ws-web-lq.douyin.com/webcast/im/push/v2/?app_name=douyin_web` +
      `&version_code=180800&webcast_sdk_version=1.0.14-beta.0` +
      `&update_version_code=1.0.14-beta.0&compress=gzip&device_platform=web&cookie_enabled=true` +
      `&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32` +
      `&browser_name=Mozilla` +
      `&browser_version=5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/126.0.0.0%20Safari/537.36` +
      `&browser_online=true&tz_name=Asia/Shanghai` +
      `&cursor=d-1_u-1_fh-7392091211001140287_t-${timestamp}_r-1` +
      `&internal_ext=internal_src:dim|wss_push_room_id:${roomId}|wss_push_did:${pushId}|first_req_ms:${timestamp}|fetch_time:${timestamp}|seq:1|wss_info:0-${timestamp}-0-0|wrds_v:7392094459690748497` +
      `&host=https://live.douyin.com&aid=6383&live_id=1&did_rule=3&endpoint=live_pc&support_wrds=1` +
      `&user_unique_id=${pushId}&im_path=/webcast/im/fetch/&identity=audience` +
      `&need_persist_msg_count=15&insert_task_id=&live_reason=&room_id=${roomId}&heartbeatDuration=0`;
    
    // 生成signature
    const signature = await this.generateSignature(wss);
    wss += `&signature=${signature}`;
    
    return wss;
  }
  
  /**
   * 生成签名
   * 引用: liveMan.py generateSignature() (行58-90)
   */
  async generateSignature(wss) {
    try {
      // 提取参数
      const urlObj = new URL(wss);
      const params = urlObj.searchParams;
      
      const paramKeys = [
        'live_id', 'aid', 'version_code', 'webcast_sdk_version',
        'room_id', 'sub_room_id', 'sub_channel_id', 'did_rule',
        'user_unique_id', 'device_platform', 'device_type', 'ac',
        'identity'
      ];
      
      const paramValues = paramKeys.map(key => `${key}=${params.get(key) || ''}`);
      const paramString = paramValues.join(',');
      
      // MD5加密
      const md5Param = crypto.createHash('md5').update(paramString).digest('hex');
      logger.debug(`MD5参数: ${md5Param}`);
      
      // 加载并执行sign.js
      const signPath = path.join(__dirname, '../utils/sign.js');
      if (!fs.existsSync(signPath)) {
        logger.warn('sign.js不存在，使用MD5作为签名');
        return md5Param;
      }
      
      const signCode = fs.readFileSync(signPath, 'utf-8');
      
      // 使用vm2执行JavaScript
      const vm = new VM({
        timeout: 5000,
        sandbox: {}
      });
      
      vm.run(signCode);
      const signature = vm.run(`get_sign('${md5Param}')`);
      
      logger.debug(`生成签名: ${signature ? signature.substring(0, 20) + '...' : 'null'}`);
      return signature || md5Param;
      
    } catch (error) {
      logger.error('生成签名失败: %s', error.message);
      // 失败时返回MD5作为备选
      try {
        const urlObj = new URL(wss);
        const params = urlObj.searchParams;
        const paramKeys = [
          'live_id', 'aid', 'version_code', 'webcast_sdk_version',
          'room_id', 'sub_room_id', 'sub_channel_id', 'did_rule',
          'user_unique_id', 'device_platform', 'device_type', 'ac',
          'identity'
        ];
        const paramValues = paramKeys.map(key => `${key}=${params.get(key) || ''}`);
        const paramString = paramValues.join(',');
        return crypto.createHash('md5').update(paramString).digest('hex');
      } catch (e) {
        return '';
      }
    }
  }
  
  /**
   * 生成随机ID
   */
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 处理连接打开
   */
  handleOpen() {
    logger.info(`✅ 直播间 ${this.roomId} 连接成功`);
    logger.info(`📊 连接信息:`, {
      roomId: this.actualRoomId,
      pushId: this.pushId,
      ttwid: this.ttwid ? this.ttwid.substring(0, 20) + '...' : 'null'
    });
    logger.info(`⏳ 等待接收直播消息...（如果长时间无消息，请检查直播间是否正在直播）`);
    this.isConnected = true;
    this.reconnectAttempts = 0; // 重置重连计数
    this.manualDisconnect = false; // 重置手动断开标记
    this.connectedAt = new Date(); // 记录连接时间
    
    // 启动心跳
    this.startHeartbeat();
    
    // 触发连接成功回调
    if (this.onConnected) {
      this.onConnected(this.roomId);
    }
  }

  /**
   * 处理接收到的消息
   * 引用: liveMan.py _wsOnMessage() (行299-338)
   */
  async handleMessage(data) {
    try {
      // 1. 解析PushFrame
      const pushFrame = this.decodePushFrame(data);
      if (!pushFrame) {
        return; // 静默跳过无效数据
      }
      
      // 记录所有收到的消息类型
      logger.debug('收到PushFrame:', {
        seqId: pushFrame.seqId,
        logId: pushFrame.logId,
        payloadType: pushFrame.payloadType,
        payloadLength: pushFrame.payload ? pushFrame.payload.length : 0
      });
      
      // 如果是心跳响应，忽略
      if (pushFrame.payloadType === 'hb') {
        logger.debug('收到心跳响应');
        return;
      }
      
      // 2. gzip解压payload - 参考Python实现，直接解压
      let payload = pushFrame.payload;
      
      if (payload && payload.length > 0) {
        try {
          // Python: response = Response().parse(gzip.decompress(package.payload))
          // 直接尝试gzip解压
          const decompressed = pako.inflate(payload);
          logger.info(`✅ gzip解压成功 | 原始:${payload.length}bytes -> 解压后:${decompressed.length}bytes`);
          payload = decompressed;
        } catch (inflateError) {
          // 如果解压失败，可能数据未压缩，直接使用
          logger.warn('⚠️ gzip解压失败，使用原始数据:', inflateError.message);
          payload = pushFrame.payload;
        }
      } else {
        logger.warn('⚠️ Payload为空，跳过此消息');
        return;
      }
      
      // 3. 解析Response
      const response = this.decodeResponse(payload);
      if (!response) {
        logger.warn('⚠️ Response解析失败，跳过');
        return;
      }
      
      logger.info(`✅ Response解析成功 | 消息数量: ${response.messagesList?.length || response.messages?.length || 0}`);
      logger.debug('Response结构:', {
        hasMessagesList: !!response.messagesList,
        hasMessages: !!response.messages,
        messagesListLength: response.messagesList?.length,
        messagesLength: response.messages?.length,
        needAck: response.needAck,
        internalExt: response.internalExt ? '存在' : '不存在',
        cursor: response.cursor,
        fetchInterval: response.fetchInterval,
        keys: Object.keys(response).slice(0, 10) // 只显示前10个键
      });
      
      // 4. 如果需要ack，发送确认
      if (response.needAck && response.internalExt) {
        this.sendAck(pushFrame.logId, response.internalExt);
      }
      
      // 5. 处理每条消息
      const messages = response.messagesList || response.messages || [];
      if (messages.length > 0) {
        for (const msg of messages) {
          await this.processMessage(msg);
        }
      }
      
    } catch (error) {
      logger.error('消息处理失败: %s', error.message || String(error));
    }
  }
  
  /**
   * 解码PushFrame
   */
  decodePushFrame(data) {
    try {
      if (!this.protoRoot) {
        logger.error('ProtoRoot未加载');
        return null;
      }
      
      const PushFrame = this.protoRoot.lookupType('new_douyin.Webcast.Im.PushFrame');
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      logger.info('收到WebSocket数据，长度: %d bytes', buffer.length);
      
      if (buffer.length < 10) {
        logger.warn('数据太短，可能是心跳或其他控制消息');
        return null;
      }
      
      logger.info('数据前50字节(hex): %s', buffer.toString('hex').substring(0, 100));
      
      const message = PushFrame.decode(buffer);
      const object = PushFrame.toObject(message, {
        longs: String,
        enums: String,
        bytes: Array,
        defaults: true
      });
      
      logger.info('PushFrame解析结果:', {
        seqId: object.seqId,
        logId: object.logId,
        service: object.service,
        method: object.method,
        payloadEncoding: object.payloadEncoding,
        payloadType: object.payloadType,
        payloadLength: object.payload ? object.payload.length : 0,
        headersCount: object.headersList ? object.headersList.length : 0
      });
      
      // 如果是心跳包，直接忽略
      if (object.payloadType === 'hb') {
        logger.debug('收到心跳响应，忽略');
        return null;
      }
      
      return object;
    } catch (error) {
      logger.error('解码PushFrame失败: %s', error.message || String(error));
      logger.info('原始数据长度:', data?.length);
      if (data && data.length > 0) {
        logger.info('原始数据前50字节: %s', data.slice(0, 50).toString('hex'));
      }
      return null;
    }
  }
  
  /**
   * 解码Response
   */
  decodeResponse(payload) {
    try {
      if (!this.protoRoot) {
        logger.error('ProtoRoot未加载');
        return null;
      }
      
      if (!payload || payload.length === 0) {
        logger.error('Payload为空');
        return null;
      }
      
      const Response = this.protoRoot.lookupType('new_douyin.Webcast.Im.Response');
      const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      
      logger.debug('开始解码Response, 数据长度: %d', buffer.length);
      logger.debug('数据前100字节(hex): %s', buffer.toString('hex').substring(0, 200));
      
      const message = Response.decode(buffer);
      const object = Response.toObject(message, {
        longs: String,
        enums: String,
        bytes: Array,
        defaults: true
      });
      
      logger.debug('Response解码成功');
      return object;
    } catch (error) {
      logger.error('解码Response失败: %s', error.message || String(error));
      logger.debug('Payload长度:', payload?.length);
      if (payload && payload.length > 0) {
        logger.debug('Payload前50字节: %s', payload.slice(0, 50).toString('hex'));
      }
      return null;
    }
  }
  
  /**
   * 发送ACK确认
   * 引用: liveMan.py _wsOnMessage() 行311-316
   */
  sendAck(logId, internalExt) {
    try {
      if (!this.protoRoot || !this.ws) return;
      
      const PushFrame = this.protoRoot.lookupType('new_douyin.Webcast.Im.PushFrame');
      const ackFrame = {
        logId: logId,
        payloadType: 'ack',
        payload: Buffer.from(internalExt, 'utf-8')
      };
      
      const encoded = PushFrame.encode(ackFrame).finish();
      this.ws.send(encoded, { binary: true });
      logger.debug('发送ACK确认');
    } catch (error) {
      logger.error('发送ACK失败: %s', error.message);
    }
  }
  
  /**
   * 处理单条消息
   * 引用: liveMan.py _wsOnMessage() 行319-338
   */
  async processMessage(msg) {
    try {
      const method = msg.method;
      if (!method) return;
      
      // 跳过无实际意义的消息类型
      const skipMethods = ['WebcastBackupSEIMessage'];
      if (skipMethods.includes(method)) {
        logger.debug(`⏭️ 跳过无意义的消息类型: ${method}`);
        return;
      }
      
      logger.info(`📨 收到消息类型: ${method}`);
      
      // 根据method类型解析payload
      let parsedData = null;
      try {
        parsedData = this.parseMessageByMethod(method, msg.payload);
        if (!parsedData) {
          logger.warn(`⚠️ 消息 ${method} 解析结果为空，将保存原始数据`);
        }
      } catch (error) {
        logger.error(`❌ 解析消息 ${method} 失败: %s`, error.message);
        logger.debug('错误堆栈: %s', error.stack);
      }
      
      // 构造消息对象
      const messageObj = {
        type: 'live',
        method: method,
        msgId: msg.msgId,
        msgType: msg.msgType,
        data: parsedData,
        rawPayload: msg.payload,
        timestamp: Date.now()
      };
      
      // 保存到数据库
      await this.saveMessageToDatabase(messageObj);
      
      // 触发回调
      // 更新消息统计
      this.messageCount++;
      this.lastMessageAt = new Date();
      
      if (this.onMessage) {
        this.onMessage(messageObj);
      }
      
    } catch (error) {
      logger.error('处理消息失败: %s', error.message);
    }
  }
  
  /**
   * 保存消息到数据库
   */
  async saveMessageToDatabase(messageObj) {
    try {
      // 提取关键信息
      const userRoomId = this.roomId; // 用户输入的roomId
      const actualRoomId = this.actualRoomId || this.roomId; // 实际的roomId
      const messageType = messageObj.type || 'Unknown';
      const method = messageObj.method || '';
      
      // 优先使用解析后的数据，如果解析失败则保存原始payload
      let dataToSave = messageObj.data;
      if (!dataToSave && messageObj.rawPayload) {
        logger.warn(`⚠️ 消息 ${method} 解析失败，保存原始数据`);
        // 如果解析失败，尝试将原始payload转为对象
        try {
          if (Buffer.isBuffer(messageObj.rawPayload)) {
            // Buffer类型，无法直接JSON序列化，保存为base64
            dataToSave = { _raw_base64: messageObj.rawPayload.toString('base64') };
            logger.debug(`已保存 ${method} 的原始数据 (Base64, ${messageObj.rawPayload.length} bytes)`);
          } else if (typeof messageObj.rawPayload === 'object') {
            dataToSave = messageObj.rawPayload;
            logger.debug(`已保存 ${method} 的原始数据 (Object)`);
          } else {
            dataToSave = { _raw: String(messageObj.rawPayload) };
            logger.debug(`已保存 ${method} 的原始数据 (String)`);
          }
        } catch (error) {
          logger.error(`❌ 转换原始payload失败: %s`, error.message);
          dataToSave = { _error: '解析失败', _method: method };
        }
      }
      
      const data = JSON.stringify(dataToSave || {});
      const timestamp = new Date();
      
      // 1. 保存到原始消息表，并获取ID
      const [result] = await db.pool.execute(
        'INSERT INTO live_messages (room_id, actual_room_id, message_type, method, data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userRoomId, actualRoomId, messageType, method, data, timestamp]
      );
      
      const liveMessageId = result.insertId;
      
      // 2. 尝试解析并保存到处理后消息表（传入 live_message_id）
      await this.processAndSaveMessage(userRoomId, actualRoomId, method, messageObj.data, timestamp, liveMessageId);
    } catch (error) {
      // 数据库错误不影响消息接收，只记录日志
      logger.error('保存消息到数据库失败: %s', error.message);
    }
  }
  
  /**
   * 根据配置解析消息并保存到messages表
   */
  async processAndSaveMessage(userRoomId, actualRoomId, method, rawData, timestamp, liveMessageId) {
    try {
      // 查询该 socket_type 的解析配置
      const [configs] = await db.pool.execute(
        'SELECT * FROM message_type_configs WHERE socket_type = ? AND is_enabled = TRUE',
        [method]
      );
      
      if (configs.length === 0) {
        return; // 没有配置，不处理
      }
      
      const config = configs[0];
      
      // 如果没有配置模板，也不处理
      if (!config.description_template) {
        return;
      }
      
      // 从模板中提取所有映射键名
      const mappingKeys = this.extractMappingKeys(config.description_template);
      
      // 查询所有需要的映射配置
      let mappings = {};
      if (mappingKeys.length > 0) {
        // 动态生成占位符: (?, ?, ?)
        const placeholders = mappingKeys.map(() => '?').join(', ');
        const [mappingConfigs] = await db.pool.execute(
          `SELECT m.mapping_key, vmi.source_value, vmi.target_value FROM value_mapping_items vmi JOIN value_mappings m ON vmi.mapping_id = m.id WHERE m.mapping_key IN (${placeholders}) AND m.is_enabled = TRUE`,
          mappingKeys
        );
        
        // 组织映射数据
        mappingConfigs.forEach(item => {
          if (!mappings[item.mapping_key]) {
            mappings[item.mapping_key] = {};
          }
          mappings[item.mapping_key][item.source_value] = item.target_value;
        });
      }
      
      // 使用模板解析数据
      const description = this.parseTemplate(config.description_template, rawData, mappings);
      
      if (description === null) {
        logger.debug('Socket类型 %s 的模板解析结果为空', method);
        return;
      }
      
      // 提取用户信息（通用逻辑）
      // 用户信息可能在不同位置：user 或 common.user
      const userInfo = rawData?.user || rawData?.common?.user || {};
      const userId = userInfo.id || userInfo.sec_uid || '';
      const userNickname = userInfo.nickname || userInfo.nickName || userInfo.name || '';
      const userLevel = userInfo.pay_grade?.level || 0;
      const fansLevel = userInfo.fans_club?.level || 0;
      
      // 提取礼物信息（如果是礼物消息）
      const giftId = rawData?.gift?.id || rawData?.giftStruct?.id || null;
      const giftName = rawData?.gift?.name || rawData?.giftStruct?.name || '';
      const giftCount = rawData?.repeatCount || rawData?.totalCount || rawData?.count || 1;
      const giftDiamondValue = rawData?.gift?.diamond_count || rawData?.giftStruct?.diamondCount || 0;
      const comboCount = rawData?.combo_count || 1;
      const groupId = rawData?.group_id || rawData?.groupId || null;
      
      // 生成唯一消息ID
      const messageId = `${actualRoomId}_${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 保存到 messages 表
      await db.pool.execute(
        `INSERT INTO messages (
          room_id, actual_room_id, socket_type, message_type, 
          user_id, user_nickname, user_level, fans_level,
          content, 
          gift_id, gift_name, gift_count, gift_diamond_value, combo_count, group_id,
          description, message_id, live_message_id, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userRoomId,
          actualRoomId,
          method,
          config.message_type,
          userId,
          userNickname,
          userLevel,
          fansLevel,
          rawData?.content || '',
          giftId,
          giftName,
          giftCount,
          giftDiamondValue,
          comboCount,
          groupId,
          description,
          messageId,
          liveMessageId,
          timestamp
        ]
      );
      
      logger.debug('消息已解析并保存: %s -> %s...', method, description.substring(0, 50));
    } catch (error) {
      logger.error('解析并保存消息失败: %s', error.message);
    }
  }
  
  /**
   * 根据模板解析数据（支持表达式和映射引用）
   * @param {string} template - 模板字符串
   * @param {object} data - 原始数据对象
   * @param {object|null} mapping - 映射配置（可选）
   * @returns {string|null} - 解析结果或null
   */
  parseTemplate(template, data, mapping = null) {
    if (!template || !data) return null;

    try {
      const result = template.replace(/\{([^}]+)\}/g, (match, expression) => {
        const expr = expression.trim();
        
        // 检查是否是映射引用: field:map_key
        if (expr.includes(':')) {
          const parts = expr.split(':');
          if (parts.length === 2) {
            const fieldPath = parts[0].trim();
            const mapKey = parts[1].trim();
            return this.resolveMapping(fieldPath, mapKey, data, mapping);
          }
        }
        
        // 检查是否是三元表达式
        if (expr.includes('?') && expr.includes(':')) {
          return this.evaluateExpression(expr, data);
        }
        
        // 普通路径访问
        return this.getValueByPath(expr, data, match);
      });

      return result;
    } catch (error) {
      logger.error('模板解析错误: %s, 模板: %s', error.message, template);
      return null;
    }
  }
  
  /**
   * 从模板中提取所有映射键名
   */
  extractMappingKeys(template) {
    if (!template) return [];
    
    const keys = new Set();
    const regex = /\{([^}]+:[^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const expression = match[1].trim();
      const parts = expression.split(':');
      if (parts.length === 2) {
        const mapKey = parts[1].trim();
        if (mapKey && !mapKey.includes('?') && !mapKey.includes(' ')) {
          keys.add(mapKey);
        }
      }
    }
    
    return Array.from(keys);
  }
  
  getValueByPath(path, data, defaultValue) {
    const paths = path.split('.');
    let current = data;
    for (const p of paths) {
      if (current === null || current === undefined) return defaultValue;
      current = current[p];
    }
    if (typeof current === 'object') return JSON.stringify(current);
    return current != null ? String(current) : defaultValue;
  }
  
  resolveMapping(fieldPath, mapKey, data, mapping) {
    if (!mapping || typeof mapping !== 'object') return `{${fieldPath}:${mapKey}}`;
    const fieldValue = this.getValueByPath(fieldPath, data, null);
    if (fieldValue === null) return `{${fieldPath}:${mapKey}}`;
    const mapConfig = mapping[mapKey];
    if (!mapConfig || typeof mapConfig !== 'object') return `{${fieldPath}:${mapKey}}`;
    const mappedValue = mapConfig[fieldValue];
    return mappedValue != null ? String(mappedValue) : fieldValue;
  }
  
  evaluateExpression(expr, data) {
    try {
      const questionIndex = expr.indexOf('?');
      const colonIndex = expr.lastIndexOf(':');
      if (questionIndex === -1 || colonIndex === -1) return this.getValueByPath(expr, data, expr);
      
      const condition = expr.substring(0, questionIndex).trim();
      const trueExpr = expr.substring(questionIndex + 1, colonIndex).trim();
      const falseExpr = expr.substring(colonIndex + 1).trim();
      
      const conditionResult = this.evaluateCondition(condition, data);
      
      if (conditionResult) {
        return trueExpr.includes('?') ? this.evaluateExpression(trueExpr, data) : this.getValueByPath(trueExpr, data, trueExpr);
      } else {
        return falseExpr.includes('?') ? this.evaluateExpression(falseExpr, data) : this.getValueByPath(falseExpr, data, falseExpr);
      }
    } catch (error) {
      logger.error('表达式评估失败: %s', error.message);
      return expr;
    }
  }
  
  evaluateCondition(condition, data) {
    const operators = ['==', '!=', '>=', '<=', '>', '<'];
    for (const op of operators) {
      const index = condition.indexOf(op);
      if (index !== -1) {
        const leftExpr = condition.substring(0, index).trim();
        const rightExpr = condition.substring(index + op.length).trim();
        const leftValue = this.getExpressionValue(leftExpr, data);
        const rightValue = this.getExpressionValue(rightExpr, data);
        switch (op) {
          case '==': return leftValue == rightValue;
          case '!=': return leftValue != rightValue;
          case '>': return Number(leftValue) > Number(rightValue);
          case '<': return Number(leftValue) < Number(rightValue);
          case '>=': return Number(leftValue) >= Number(rightValue);
          case '<=': return Number(leftValue) <= Number(rightValue);
        }
      }
    }
    const value = this.getExpressionValue(condition, data);
    return Boolean(value);
  }
  
  getExpressionValue(expr, data) {
    if (/^-?\d+$/.test(expr)) return parseInt(expr);
    if (/^-?\d+\.\d+$/.test(expr)) return parseFloat(expr);
    if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
      return expr.slice(1, -1);
    }
    return this.getValueByPath(expr, data, expr);
  }
  
  /**
   * 根据method解析消息
   * 引用: liveMan.py _wsOnMessage() 行322-336
   */
  parseMessageByMethod(method, payload) {
    if (!this.protoRoot || !payload) return null;
    
    // 从配置文件获取proto类型
    const protoType = getProtoType(method);
    if (!protoType) {
      logger.warn(`⚠️ 未定义的消息类型: ${method}，将保存原始数据`);
      return null;
    }
    
    try {
      const Type = this.protoRoot.lookupType(protoType);
      const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      const message = Type.decode(buffer);
      const object = Type.toObject(message, {
        longs: String,
        enums: String,
        bytes: Array,
        defaults: true
      });
      
      return object;
    } catch (error) {
      logger.error(`❌ Protobuf解析 ${method} 失败: %s`, error.message);
      logger.debug('Payload长度: %d', payload ? payload.length : 0);
      logger.debug('错误堆栈: %s', error.stack);
      return null;
    }
  }

  /**
   * 处理连接关闭
   */
  handleClose(code, reason) {
    logger.warn(`⚠️ 直播间 ${this.roomId} 连接关闭 (code: ${code}, reason: ${reason})`);
    this.isConnected = false;
    this.stopHeartbeat();
    
    // 触发断开连接回调
    if (this.onDisconnected) {
      this.onDisconnected(this.roomId, code, reason);
    }
    
    // 尝试重连
    this.reconnect();
  }

  /**
   * 处理错误
   */
  handleError(error) {
    logger.error('❌ 直播间 %s WebSocket错误: %s', this.roomId, error.message);
    
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * 重连逻辑
   */
  reconnect() {
    // 如果是手动断开，不重连
    if (this.manualDisconnect) {
      logger.info(`直播间 ${this.roomId} 已手动断开，不再重连`);
      return;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`🔄 ${this.reconnectAttempts}秒后尝试重连直播间 ${this.roomId}...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      logger.error(`❌ 达到最大重连次数(${this.maxReconnectAttempts})，停止重连直播间 ${this.roomId}`);
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    logger.info(`主动断开直播间 ${this.roomId} 的连接`);
    this.manualDisconnect = true; // 标记为手动断开
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  /**
   * 启动心跳
   * 引用: liveMan.py _sendHeartbeat() (行277-290)
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          // 发送ping帧 - 使用protobuf编码
          if (this.protoRoot) {
            const PushFrame = this.protoRoot.lookupType('new_douyin.Webcast.Im.PushFrame');
            const heartbeat = {
              payloadType: 'hb'
            };
            const encoded = PushFrame.encode(heartbeat).finish();
            this.ws.send(encoded, { binary: true });
          } else {
            // 如果proto未加载，使用简单的ping
            this.ws.ping();
          }
          logger.debug('发送心跳包');
        } catch (error) {
          logger.error('发送心跳失败: %s', error.message);
        }
      }
    }, 10000); // 每10秒发送一次心跳（比Python的5秒稍长）
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

module.exports = DouyinWebSocket;
