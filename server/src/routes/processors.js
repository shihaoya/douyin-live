const express = require('express');
const router = express.Router();
const MessageProcessorController = require('../controllers/MessageProcessorController');

/**
 * 消息处理器管理API
 */

// 获取所有处理器配置
router.get('/', MessageProcessorController.getProcessors.bind(MessageProcessorController));

// 获取所有 Socket 类型
router.get('/socket-types', MessageProcessorController.getSocketTypes.bind(MessageProcessorController));

// 添加处理器配置
router.post('/', MessageProcessorController.addProcessor.bind(MessageProcessorController));

// 更新处理器配置
router.put('/:id', MessageProcessorController.updateProcessor.bind(MessageProcessorController));

// 删除处理器配置
router.delete('/:id', MessageProcessorController.deleteProcessor.bind(MessageProcessorController));

// 测试解析模板
router.post('/test', MessageProcessorController.testTemplate.bind(MessageProcessorController));

// 重新处理历史消息
router.post('/reprocess', MessageProcessorController.reprocessHistory.bind(MessageProcessorController));

module.exports = router;
