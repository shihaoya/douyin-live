const axios = require('axios');
const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * QQ机器人服务
 * 用于发送QQ消息和刷新openid
 */

class QQBotService {
  constructor() {
    this.config = {
      appId: process.env.QQ_BOT_APP_ID || '',
      appSecret: process.env.QQ_BOT_APP_SECRET || '',
      userId: process.env.QQ_BOT_USER_ID || '' // openid
    };
    
    this.accessToken = null;
    this.tokenExpireTime = 0;
    
    // openid记录文件路径
    this.openidFile = path.join(__dirname, '../../qqbot_openid.json');
    
    // 从文件加载openid
    this.loadOpenid();
  }

  /**
   * 从文件加载openid
   */
  loadOpenid() {
    try {
      if (fs.existsSync(this.openidFile)) {
        const data = JSON.parse(fs.readFileSync(this.openidFile, 'utf-8'));
        if (data.userId) {
          this.config.userId = data.userId;
          logger.info(`✅ 从文件加载openid: ${data.userId}`);
        }
      }
    } catch (error) {
      logger.error('加载openid文件失败:', error.message);
    }
  }

  /**
   * 保存openid到文件
   */
  saveOpenid(openid) {
    try {
      const data = {
        userId: openid,
        updateTime: new Date().toISOString()
      };
      fs.writeFileSync(this.openidFile, JSON.stringify(data, null, 2), 'utf-8');
      this.config.userId = openid;
      logger.info(`💾 openid已保存到: ${this.openidFile}`);
    } catch (error) {
      logger.error('保存openid失败:', error.message);
    }
  }

  /**
   * 获取AccessToken
   */
  async getAccessToken() {
    // 检查token是否过期
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const url = 'https://bots.qq.com/app/getAppAccessToken';
      const response = await axios.post(url, {
        appId: this.config.appId,
        clientSecret: this.config.appSecret
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      // token有效期2小时，提前5分钟刷新
      this.tokenExpireTime = Date.now() + (2 * 60 * 60 * 1000) - (5 * 60 * 1000);
      
      logger.info('✅ 获取QQ Bot AccessToken成功');
      return this.accessToken;
    } catch (error) {
      logger.error('❌ 获取QQ Bot AccessToken失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 发送QQ消息
   * @param {string} openid - 用户openid
   * @param {string} content - 消息内容
   */
  async sendMessage(openid, content) {
    if (!openid) {
      logger.error('❌ 发送QQ消息失败: openid为空');
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.sgroup.qq.com/v2/users/${openid}/messages`;

      const messageData = {
        content: content,
        msg_type: 0 // 0=文本消息
      };

      const response = await axios.post(url, messageData, {
        headers: {
          'Authorization': `QQBot ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info('✅ QQ消息发送成功:', content.substring(0, 50));
      return true;
    } catch (error) {
      logger.error('❌ QQ消息发送失败:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * 发送开播通知
   * @param {string} roomName - 直播间名称
   * @param {string} roomId - 直播间ID
   * @param {string} streamUrl - 直播流地址
   */
  async sendLiveStartNotification(roomName, roomId, streamUrl) {
    const content = `🔴 开播提醒\n\n主播：${roomName}\n房间号：${roomId}\n\n直播已开始，快去观看吧！`;
    return await this.sendMessage(this.config.userId, content);
  }

  /**
   * 刷新openid（发送测试消息）
   * @param {string} newOpenid - 新的openid
   */
  async refreshOpenid(newOpenid) {
    if (!newOpenid) {
      return { success: false, message: 'openid不能为空' };
    }

    try {
      // 保存新的openid
      this.saveOpenid(newOpenid);

      // 发送测试消息
      const content = `✅ OpenID已更新\n\n您的QQ机器人配置已成功更新！\n当前OpenID: ${newOpenid}\n\n现在您可以接收开播提醒等通知了。`;
      const success = await this.sendMessage(newOpenid, content);

      if (success) {
        return { 
          success: true, 
          message: 'OpenID更新成功，测试消息已发送',
          openid: newOpenid
        };
      } else {
        return { 
          success: false, 
          message: 'OpenID已保存，但测试消息发送失败' 
        };
      }
    } catch (error) {
      logger.error('刷新OpenID失败:', error.message);
      return { 
        success: false, 
        message: '刷新OpenID失败: ' + error.message 
      };
    }
  }

  /**
   * 获取当前配置的openid
   */
  getCurrentOpenid() {
    return this.config.userId;
  }

  /**
   * 检查是否已配置openid
   */
  isConfigured() {
    return !!(this.config.appId && this.config.appSecret && this.config.userId);
  }
}

// 创建单例
const qqBotService = new QQBotService();

module.exports = qqBotService;
