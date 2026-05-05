const axios = require('axios');
const logger = require('../config/logger');
const WebSocketServer = require('../websocket/WebSocketServer');
const db = require('../config/database');
const config = require('../config');
const qqBotService = require('./qqbot');

/**
 * 抖音开播监听器
 * 定期检查配置的直播间是否开播，开播时自动启动WebSocket监听
 */
class LiveMonitor {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || config.monitor.checkInterval; // 从配置读取
    this.restartCooldown = options.restartCooldown || config.monitor.restartCooldown; // 重启冷却时间
    this.timer = null;
    this.isRunning = false;
    this.monitoredRooms = new Map(); // roomId -> {lastStatus, lastCheckTime}
    this.lastRestartTime = new Map(); // roomId -> timestamp，记录上次重启时间
  }

  /**
   * 启动监听器
   */
  start() {
    if (this.isRunning) {
      logger.warn('开播监听器已在运行中');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 开播监听器已启动');

    // 立即执行一次检查
    this.checkAllRooms();

    // 设置定时检查
    this.timer = setInterval(() => {
      this.checkAllRooms();
    }, this.checkInterval);
  }

  /**
   * 停止监听器
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    logger.info('⏹️ 开播监听器已停止');
  }

  /**
   * 检查所有配置的直播间
   */
  async checkAllRooms() {
    try {
      // 从数据库获取所有激活的直播间配置
      const [configs] = await db.pool.execute(
        'SELECT room_id, room_name FROM room_configs WHERE is_active = TRUE AND deleted_at IS NULL'
      );

      if (configs.length === 0) {
        logger.debug('没有配置需要监听的直播间');
        return;
      }

      logger.debug(`正在检查 ${configs.length} 个直播间的开播状态...`);

      // 并行检查所有直播间
      const checkPromises = configs.map(config => this.checkRoomStatus(config));
      await Promise.allSettled(checkPromises);

    } catch (error) {
      logger.error('检查直播间状态失败:', error.message);
    }
  }

  /**
   * 检查单个直播间的状态
   */
  async checkRoomStatus(config) {
    const { room_id: roomId, room_name: roomName } = config;

    try {
      const wsServer = WebSocketServer.getInstance();
      
      // 获取直播间信息
      const liveInfo = await this.getLiveRoomInfo(roomId);
      
      if (!liveInfo) {
        logger.warn(`无法获取直播间 ${roomId} 的信息`);
        return;
      }

      const previousStatus = this.monitoredRooms.get(roomId);
      const currentStatus = liveInfo.isLive ? 'live' : 'offline';
      const isMonitoring = wsServer.hasRoom(roomId);

      // 检测状态变化：从未开播变为开播
      if (liveInfo.isLive && (!previousStatus || previousStatus !== 'live')) {
        logger.info(`🎉 检测到直播间 ${roomId} (${roomName || liveInfo.owner}) 已开播！`);
        logger.info(`   标题: ${liveInfo.title}`);
        logger.info(`   主播: ${liveInfo.owner}`);
        logger.info(`   观众: ${liveInfo.userCount}`);

        // 检查是否在冷却期内
        const lastRestart = this.lastRestartTime.get(roomId);
        const now = Date.now();
        const timeSinceLastRestart = lastRestart ? now - lastRestart : Infinity;
        
        if (isMonitoring) {
          // 已在监控中，检查是否需要重启
          if (timeSinceLastRestart < this.restartCooldown) {
            const remainingSeconds = Math.ceil((this.restartCooldown - timeSinceLastRestart) / 1000);
            logger.debug(`⏳ 直播间 ${roomId} 在冷却期内，${remainingSeconds}秒后可再次重启`);
          } else {
            // 不在冷却期，执行重启
            logger.info(`🔄 直播间 ${roomId} 已在监控中，重启WebSocket连接以确保接收消息...`);
            await this.restartMonitoring(roomId, liveInfo);
            this.lastRestartTime.set(roomId, now); // 记录重启时间
          }
        } else {
          // 未在监控中，直接启动
          logger.info(`▶️ 直播间 ${roomId} 未在监控中，启动监听...`);
          await this.autoStartMonitoring(roomId, liveInfo);
        }

        // 发送通知（如果配置了）
        await this.sendNotification(liveInfo);
      } else if (!liveInfo.isLive && previousStatus === 'live') {
        logger.info(`⏹️ 直播间 ${roomId} (${roomName || liveInfo.owner}) 已下播`);
        
        // 可选：下播时停止监听
        // await this.autoStopMonitoring(roomId);
      }

      // 更新状态记录
      this.monitoredRooms.set(roomId, currentStatus);

    } catch (error) {
      logger.error('检查直播间 %s 状态失败: %s', roomId, error.message);
    }
  }

  /**
   * 获取直播间信息
   */
  async getLiveRoomInfo(roomId) {
    try {
      // 第一步：获取ttwid cookie
      const ttwidResponse = await axios.post(
        'https://ttwid.bytedance.com/ttwid/union/register/',
        JSON.stringify({
          region: 'cn',
          aid: 6383,
          needFid: false,
          service: 'www.ixigua.com',
          migrate_info: { ticket: '', source: 'node' },
          cbUrlProtocol: 'https',
          union: true
        }),
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      let ttwid = '';
      const setCookie = ttwidResponse.headers['set-cookie'];
      if (setCookie) {
        const match = setCookie[0].match(/ttwid=([^;]+)/);
        if (match) {
          ttwid = match[1];
        }
      }

      // 第二步：调用API获取直播间状态
      const apiResponse = await axios.get('https://live.douyin.com/webcast/room/web/enter/', {
        params: {
          aid: 6383,
          app_name: 'douyin_web',
          live_id: 1,
          device_platform: 'web',
          language: 'zh-CN',
          cookie_enabled: true,
          screen_width: 1920,
          screen_height: 1080,
          browser_language: 'zh-CN',
          browser_platform: 'Win32',
          browser_name: 'Mozilla',
          browser_version: '5.0',
          enter_from: 'web_live',
          web_rid: roomId,
          room_id_str: roomId,
          enter_source: '',
          need_map: 1,
          is_need_double_stream: false
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://live.douyin.com/${roomId}`,
          'Cookie': `ttwid=${ttwid}`,
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 10000
      });

      const data = apiResponse.data;
      
      if (!data || !data.data || !data.data.data || !Array.isArray(data.data.data)) {
        throw new Error('API返回数据异常');
      }

      const roomData = data.data.data[0];
      const status = roomData.status;
      const title = roomData.title || '未知标题';
      const owner = roomData.owner?.nickname || '未知主播';
      
      return {
        roomId,
        webRid: roomId,
        status,
        isLive: status === 2,
        title,
        owner,
        userCount: roomData.user_count_str || '0',
        startTime: roomData.stats?.start_time || 0
      };

    } catch (error) {
      logger.error('获取直播间 %s 信息失败: %s', roomId, error.message);
      return null;
    }
  }

  /**
   * 重启监听（先停止再启动）
   */
  async restartMonitoring(roomId, liveInfo) {
    try {
      const wsServer = WebSocketServer.getInstance();
      
      // 1. 停止当前监听
      logger.info(`⏹️ 停止直播间 ${roomId} 的当前监听...`);
      await wsServer.stopRoom(roomId);
      
      // 等待一小段时间确保连接完全关闭
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. 重新启动监听
      logger.info(`▶️ 重新启动直播间 ${roomId} 的监听...`);
      await wsServer.startRoom(roomId);
      
      logger.info(`✅ 已重启直播间 ${roomId} 的WebSocket监听，现在可以接收开播消息`);

      // 更新数据库状态
      await db.pool.execute(
        'UPDATE room_configs SET is_active = TRUE, updated_at = NOW() WHERE room_id = ?',
        [roomId]
      );

    } catch (error) {
      logger.error('重启监听直播间 %s 失败: %s', roomId, error.message);
    }
  }

  /**
   * 自动启动监听
   */
  async autoStartMonitoring(roomId, liveInfo) {
    try {
      const wsServer = WebSocketServer.getInstance();
      
      // 检查是否已经在监听
      if (wsServer.hasRoom(roomId)) {
        logger.info(`直播间 ${roomId} 已在监听中，无需重复启动`);
        return;
      }

      // 启动WebSocket监听
      await wsServer.startRoom(roomId);
      
      logger.info(`✅ 已自动启动直播间 ${roomId} 的WebSocket监听`);

      // 更新数据库状态
      await db.pool.execute(
        'UPDATE room_configs SET is_active = TRUE, updated_at = NOW() WHERE room_id = ?',
        [roomId]
      );

    } catch (error) {
      logger.error('自动启动监听直播间 %s 失败: %s', roomId, error.message);
    }
  }

  /**
   * 自动停止监听（可选功能）
   */
  async autoStopMonitoring(roomId) {
    try {
      const wsServer = WebSocketServer.getInstance();
      
      if (!wsServer.hasRoom(roomId)) {
        return;
      }

      // 停止WebSocket监听
      await wsServer.stopRoom(roomId);
      
      logger.info(`✅ 已自动停止直播间 ${roomId} 的WebSocket监听`);

      // 更新数据库状态
      await db.pool.execute(
        'UPDATE room_configs SET is_active = FALSE, updated_at = NOW() WHERE room_id = ?',
        [roomId]
      );

    } catch (error) {
      logger.error('自动停止监听直播间 %s 失败: %s', roomId, error.message);
    }
  }

  /**
   * 发送开播通知
   */
  async sendNotification(liveInfo) {
    try {
      const message = `🎉 开播提醒\n\n` +
        `直播间: ${liveInfo.owner}\n` +
        `标题: ${liveInfo.title}\n` +
        `观众: ${liveInfo.userCount}\n` +
        `房间ID: ${liveInfo.roomId}`;

      logger.info(message);

      // 发送QQ通知
      if (qqBotService.isConfigured()) {
        logger.info('📱 发送QQ开播通知...');
        const success = await qqBotService.sendLiveStartNotification(
          liveInfo.owner,
          liveInfo.roomId,
          ''
        );
        if (success) {
          logger.info('✅ QQ通知发送成功');
        } else {
          logger.warn('⚠️ QQ通知发送失败');
        }
      } else {
        logger.debug('QQ机器人未配置，跳过QQ通知');
      }

      // TODO: 集成飞书/钉钉等推送
      // await this.sendFeishuNotification(message);
      // await this.sendDingTalkNotification(message);

    } catch (error) {
      logger.error('发送通知失败:', error.message);
    }
  }

  /**
   * 获取监听状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      monitoredRooms: Array.from(this.monitoredRooms.entries()).map(([roomId, status]) => ({
        roomId,
        status
      }))
    };
  }
}

module.exports = LiveMonitor;

// 单例实例
let instance = null;

/**
 * 获取LiveMonitor单例
 */
function getInstance() {
  return instance;
}

/**
 * 设置LiveMonitor单例
 */
function setInstance(inst) {
  instance = inst;
}

module.exports.getInstance = getInstance;
module.exports.setInstance = setInstance;
