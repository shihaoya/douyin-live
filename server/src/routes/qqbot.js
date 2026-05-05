const express = require('express');
const router = express.Router();
const qqBotController = require('../controllers/QQBotController');

/**
 * QQ机器人路由
 */

// 刷新OpenID
router.post('/refresh-openid', qqBotController.refreshOpenid.bind(qqBotController));

// 获取当前OpenID配置
router.get('/config', qqBotController.getCurrentOpenid.bind(qqBotController));

// 测试发送消息
router.post('/test-message', qqBotController.testMessage.bind(qqBotController));

module.exports = router;
