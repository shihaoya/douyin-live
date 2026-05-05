const WebSocketServer = require('../websocket/WebSocketServer');
const logger = require('../config/logger');
const db = require('../config/database');
const LiveMonitor = require('../utils/LiveMonitor');

/**
 * 直播间控制器
 */
class RoomController {
  
  /**
   * 获取所有监听的直播间（不包括已删除的）
   */
  static async getAllRooms(req, res) {
    try {
      const wsServer = WebSocketServer.getInstance();
      const activeRooms = wsServer.getAllRooms();
      
      // 从数据库获取配置信息（权威数据源）
      const [configs] = await db.pool.execute(
        'SELECT room_id, room_name, is_active, auto_start, deleted_at FROM room_configs WHERE deleted_at IS NULL'
      );
      
      // 以数据库为准，合并内存中的运行时状态
      const result = configs.map(config => {
        // 查找内存中是否有该直播间的运行时状态
        const activeRoom = activeRooms.find(r => r.roomId === config.room_id);
        
        return {
          roomId: config.room_id,
          roomName: config.room_name,
          isActive: config.is_active,
          autoStart: config.auto_start,
          isDeleted: false,
          // 如果有运行时状态，使用内存中的数据；否则显示断开
          status: activeRoom ? activeRoom.status : 'disconnected',
          connectedAt: activeRoom ? activeRoom.connectedAt : null,
          messageCount: activeRoom ? activeRoom.messageCount : 0,
          lastMessageAt: activeRoom ? activeRoom.lastMessageAt : null
        };
      });
      
      res.json({
        code: 200,
        message: 'success',
        data: {
          total: result.length,
          rooms: result
        }
      });
    } catch (error) {
      logger.error('获取直播间列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取直播间列表失败'
      });
    }
  }
  
  /**
   * 获取所有直播间（包括已删除的，用于下拉菜单等）
   */
  static async getAllRoomsWithDeleted(req, res) {
    try {
      const wsServer = WebSocketServer.getInstance();
      const rooms = wsServer.getAllRooms();
      
      // 从数据库获取配置信息（包括已删除的）
      const [configs] = await db.pool.execute(
        'SELECT room_id, room_name, is_active, auto_start, deleted_at FROM room_configs'
      );
      
      // 合并内存状态和数据库配置
      const roomMap = new Map();
      configs.forEach(config => {
        roomMap.set(config.room_id, {
          roomId: config.room_id,
          roomName: config.room_name,
          isActive: config.is_active,
          autoStart: config.auto_start,
          isDeleted: !!config.deleted_at,
          status: 'disconnected',
          connectedAt: null,
          messageCount: 0
        });
      });
      
      // 更新正在运行的直播间状态
      rooms.forEach(room => {
        if (roomMap.has(room.roomId)) {
          const config = roomMap.get(room.roomId);
          config.status = room.status;
          config.connectedAt = room.connectedAt;
          config.messageCount = room.messageCount;
        } else {
          roomMap.set(room.roomId, {
            roomId: room.roomId,
            roomName: null,
            isActive: true,
            autoStart: true,
            isDeleted: false,
            status: room.status,
            connectedAt: room.connectedAt,
            messageCount: room.messageCount
          });
        }
      });
      
      const result = Array.from(roomMap.values());
      
      res.json({
        code: 200,
        message: 'success',
        data: {
          total: result.length,
          rooms: result
        }
      });
    } catch (error) {
      logger.error('获取所有直播间失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取直播间列表失败'
      });
    }
  }
  
  /**
   * 开始监听直播间
   */
  static async startRoom(req, res) {
    try {
      const { roomId } = req.params;
      const { roomName } = req.body || {};
      
      if (!roomId) {
        return res.status(400).json({
          code: 400,
          message: '直播间ID不能为空'
        });
      }
      
      // 检查是否已经在监听
      const wsServer = WebSocketServer.getInstance();
      if (wsServer.hasRoom(roomId)) {
        return res.status(409).json({
          code: 409,
          message: '该直播间已在监听中',
          data: { roomId }
        });
      }
      
      // 保存到数据库（如果不存在则插入，已删除的恢复）
      if (roomName) {
        // 如果有名称，更新名称
        await db.pool.execute(
          'INSERT INTO room_configs (room_id, room_name, is_active, auto_start, deleted_at) VALUES (?, ?, TRUE, TRUE, NULL) ON DUPLICATE KEY UPDATE room_name = VALUES(room_name), is_active = TRUE, deleted_at = NULL, updated_at = NOW()',
          [roomId, roomName]
        );
      } else {
        // 如果没有名称，只更新状态，保留原名称
        await db.pool.execute(
          'INSERT INTO room_configs (room_id, is_active, auto_start, deleted_at) VALUES (?, TRUE, TRUE, NULL) ON DUPLICATE KEY UPDATE is_active = TRUE, deleted_at = NULL, updated_at = NOW()',
          [roomId]
        );
      }
      
      // 启动监听
      await wsServer.startRoom(roomId);
      
      res.json({
        code: 200,
        message: '开始监听直播间成功',
        data: { roomId }
      });
    } catch (error) {
      logger.error(`启动直播间 ${req.params.roomId} 失败:`, error);
      res.status(500).json({
        code: 500,
        message: error.message || '启动直播间失败'
      });
    }
  }
  
  /**
   * 停止监听直播间
   */
  static async stopRoom(req, res) {
    try {
      const { roomId } = req.params;
      
      const wsServer = WebSocketServer.getInstance();
      if (!wsServer.hasRoom(roomId)) {
        return res.status(404).json({
          code: 404,
          message: '该直播间未在监听中'
        });
      }
      
      // 停止监听
      await wsServer.stopRoom(roomId);
      
      // 更新数据库状态：仅设置为非激活，不删除
      await db.pool.execute(
        'UPDATE room_configs SET is_active = FALSE, updated_at = NOW() WHERE room_id = ?',
        [roomId]
      );
      
      res.json({
        code: 200,
        message: '暂停监控成功',
        data: { roomId }
      });
    } catch (error) {
      logger.error(`暂停直播间 ${req.params.roomId} 失败:`, error);
      res.status(500).json({
        code: 500,
        message: '暂停监控失败'
      });
    }
  }
  
  /**
   * 获取直播间状态
   */
  static async getRoomStatus(req, res) {
    try {
      const { roomId } = req.params;
      const wsServer = WebSocketServer.getInstance();
      const room = wsServer.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({
          code: 404,
          message: '该直播间未在监听中'
        });
      }
      
      res.json({
        code: 200,
        message: 'success',
        data: {
          roomId: room.roomId,
          status: room.status,
          connectedAt: room.connectedAt,
          messageCount: room.messageCount,
          lastMessageAt: room.lastMessageAt
        }
      });
    } catch (error) {
      logger.error(`获取直播间 ${req.params.roomId} 状态失败:`, error);
      res.status(500).json({
        code: 500,
        message: '获取直播间状态失败'
      });
    }
  }
  
  /**
   * 获取直播间历史消息
   */
  static async getRoomMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { type, limit = 100, offset = 0 } = req.query;
      
      // 从数据库查询历史消息
      let query = 'SELECT * FROM live_messages WHERE room_id = ?';
      const params = [roomId];
      
      if (type) {
        query += ' AND message_type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const [messages] = await db.pool.execute(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM live_messages WHERE room_id = ?';
      const countParams = [roomId];
      
      if (type) {
        countQuery += ' AND message_type = ?';
        countParams.push(type);
      }
      
      const [countResult] = await db.pool.execute(countQuery, countParams);
      
      res.json({
        code: 200,
        message: 'success',
        data: {
          total: countResult[0].total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          messages: messages
        }
      });
    } catch (error) {
      logger.error(`获取直播间 ${req.params.roomId} 消息失败:`, error);
      res.status(500).json({
        code: 500,
        message: '获取消息失败'
      });
    }
  }
  
  /**
   * 删除直播间配置（逻辑删除）
   */
  static async deleteRoom(req, res) {
    try {
      const { roomId } = req.params;
      
      // 先停止监听
      const wsServer = WebSocketServer.getInstance();
      if (wsServer.hasRoom(roomId)) {
        await wsServer.stopRoom(roomId);
      }
      
      // 逻辑删除：设置 deleted_at
      const [result] = await db.pool.execute(
        'UPDATE room_configs SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW() WHERE room_id = ?',
        [roomId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          code: 404,
          message: '直播间配置不存在'
        });
      }
      
      res.json({
        code: 200,
        message: '删除成功',
        data: { roomId }
      });
    } catch (error) {
      logger.error(`删除直播间 ${req.params.roomId} 失败:`, error);
      res.status(500).json({
        code: 500,
        message: '删除失败'
      });
    }
  }
  
  /**
   * 启动开播监听器
   */
  static async startMonitor(req, res) {
    try {
      const { interval } = req.body || {};
      
      let monitor = LiveMonitor.getInstance();
      
      if (!monitor) {
        // 创建新的监听器实例
        monitor = new LiveMonitor({
          checkInterval: interval || 60000 // 默认60秒
        });
        LiveMonitor.setInstance(monitor);
      }
      
      if (monitor.isRunning) {
        return res.status(409).json({
          code: 409,
          message: '开播监听器已在运行中'
        });
      }
      
      monitor.start();
      
      res.json({
        code: 200,
        message: '开播监听器已启动',
        data: monitor.getStatus()
      });
    } catch (error) {
      logger.error('启动开播监听器失败:', error);
      res.status(500).json({
        code: 500,
        message: '启动开播监听器失败'
      });
    }
  }
  
  /**
   * 停止开播监听器
   */
  static async stopMonitor(req, res) {
    try {
      const monitor = LiveMonitor.getInstance();
      
      if (!monitor || !monitor.isRunning) {
        return res.status(404).json({
          code: 404,
          message: '开播监听器未在运行'
        });
      }
      
      monitor.stop();
      
      res.json({
        code: 200,
        message: '开播监听器已停止'
      });
    } catch (error) {
      logger.error('停止开播监听器失败:', error);
      res.status(500).json({
        code: 500,
        message: '停止开播监听器失败'
      });
    }
  }
  
  /**
   * 获取开播监听器状态
   */
  static async getMonitorStatus(req, res) {
    try {
      const monitor = LiveMonitor.getInstance();
      
      if (!monitor) {
        return res.json({
          code: 200,
          message: 'success',
          data: {
            isRunning: false,
            monitoredRooms: []
          }
        });
      }
      
      res.json({
        code: 200,
        message: 'success',
        data: monitor.getStatus()
      });
    } catch (error) {
      logger.error('获取开播监听器状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取状态失败'
      });
    }
  }
}

module.exports = RoomController;
