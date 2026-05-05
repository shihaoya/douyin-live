const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/RoomController');
const MessageController = require('../controllers/MessageController');
const logger = require('../config/logger');

/**
 * 直播间管理API
 */

// 获取所有监听的直播间（不包括已删除的）
router.get('/', RoomController.getAllRooms);

// 获取所有直播间（包括已删除的，用于下拉菜单）
router.get('/all', RoomController.getAllRoomsWithDeleted);

// 开始监听直播间
router.post('/:roomId/start', RoomController.startRoom);

// 停止监听直播间
router.delete('/:roomId', RoomController.stopRoom);

// 删除直播间配置（逻辑删除）
router.delete('/:roomId/config', RoomController.deleteRoom);

// 获取直播间状态
router.get('/:roomId/status', RoomController.getRoomStatus);

// 获取直播间历史消息（原始消息，按时间降序）
router.get('/:roomId/messages', RoomController.getRoomMessages);

// 获取单条消息的原始数据
router.get('/messages/:messageId/raw', MessageController.getMessageRawData);

// 获取示例消息数据
router.get('/sample-data', MessageController.getSampleData);

// 获取消息类型统计
router.get('/:roomId/stats', MessageController.getMessageStats);

// 删除直播间所有消息
router.delete('/:roomId/messages', MessageController.deleteMessages);

// 开播监听器相关API
router.post('/monitor/start', RoomController.startMonitor);      // 启动开播监听器
router.post('/monitor/stop', RoomController.stopMonitor);        // 停止开播监听器
router.get('/monitor/status', RoomController.getMonitorStatus);  // 获取监听器状态

module.exports = router;
