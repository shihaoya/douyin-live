const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/MessageController');

/**
 * 消息管理API
 */

// 获取直播间消息列表（查询 messages 表）
router.get('/:roomId', MessageController.getMessages);

// 删除直播间所有消息
router.delete('/:roomId', MessageController.deleteMessages);

module.exports = router;
