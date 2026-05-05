const qqBotService = require('../utils/qqbot');
const logger = require('../config/logger');

/**
 * QQ机器人控制器
 */

class QQBotController {
  /**
   * 刷新OpenID
   */
  async refreshOpenid(req, res) {
    try {
      const { openid } = req.body;

      if (!openid) {
        return res.status(400).json({
          code: 400,
          message: '请提供openid参数'
        });
      }

      logger.info(`🔄 请求刷新OpenID: ${openid}`);

      const result = await qqBotService.refreshOpenid(openid);

      if (result.success) {
        return res.json({
          code: 200,
          message: result.message,
          data: {
            openid: result.openid
          }
        });
      } else {
        return res.status(500).json({
          code: 500,
          message: result.message
        });
      }
    } catch (error) {
      logger.error('刷新OpenID失败:', error);
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取当前OpenID配置
   */
  async getCurrentOpenid(req, res) {
    try {
      const openid = qqBotService.getCurrentOpenid();
      const configured = qqBotService.isConfigured();

      return res.json({
        code: 200,
        data: {
          openid: openid || null,
          configured: configured
        }
      });
    } catch (error) {
      logger.error('获取OpenID配置失败:', error);
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 测试发送消息
   */
  async testMessage(req, res) {
    try {
      const { content } = req.body;
      const openid = qqBotService.getCurrentOpenid();

      if (!openid) {
        return res.status(400).json({
          code: 400,
          message: '未配置OpenID，请先刷新OpenID'
        });
      }

      const testContent = content || '这是一条测试消息';
      const success = await qqBotService.sendMessage(openid, testContent);

      if (success) {
        return res.json({
          code: 200,
          message: '测试消息发送成功'
        });
      } else {
        return res.status(500).json({
          code: 500,
          message: '消息发送失败'
        });
      }
    } catch (error) {
      logger.error('测试消息发送失败:', error);
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new QQBotController();
