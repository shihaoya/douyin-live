const db = require('../config/database');
const logger = require('../config/logger');

/**
 * 消息查询控制器
 */
class MessageController {
  
  /**
   * 获取直播间的消息列表
   */
  async getMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { 
        page = 1, 
        limit = 50, 
        messageType,
        userNickname,
        giftName,
        startTime,
        endTime
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      let conditions = ['room_id = ?'];
      let params = [roomId];
      
      if (messageType) {
        conditions.push('socket_type = ?'); // messages表使用socket_type字段
        params.push(messageType);
      }
      
      if (userNickname) {
        conditions.push('user_nickname LIKE ?');
        params.push(`%${userNickname}%`);
      }
      
      if (giftName) {
        conditions.push('gift_name LIKE ?');
        params.push(`%${giftName}%`);
      }
      
      if (startTime) {
        conditions.push('received_at >= ?');
        params.push(startTime);
      }
      
      if (endTime) {
        conditions.push('received_at <= ?');
        params.push(endTime);
      }
      
      const whereClause = conditions.join(' AND ');
      
      // 查询总数
      const [countRows] = await db.pool.execute(
        `SELECT COUNT(*) as total FROM messages WHERE ${whereClause}`,
        params
      );
      const total = countRows[0].total;
      
      // 查询数据
      const [rows] = await db.pool.execute(
        `SELECT id, room_id, actual_room_id, socket_type, message_type, 
                user_id, user_nickname, user_level, fans_level,
                content, gift_id, gift_name, gift_count, gift_diamond_value, combo_count, group_id,
                description, message_id, received_at
         FROM messages 
         WHERE ${whereClause} 
         ORDER BY received_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );
      
      res.json({
        code: 200,
        message: '查询成功',
        data: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          messages: rows
        }
      });
      
    } catch (error) {
      logger.error('查询消息失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '查询失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取单条消息的原始数据（从 live_messages 表）
   */
  async getMessageRawData(req, res) {
    try {
      const { messageId } = req.params;
      
      let rawData = null;
      
      // 首先尝试作为 live_messages 表的 ID 查询
      const [liveMessages] = await db.pool.execute(
        'SELECT data FROM live_messages WHERE id = ?',
        [messageId]
      );
      
      if (liveMessages.length > 0) {
        rawData = liveMessages[0].data;
        logger.debug('通过 live_message_id %d 找到原始数据', messageId);
      } else {
        // 如果不是 live_messages 的ID，尝试作为 messages 表的 message_id 查询
        const [messages] = await db.pool.execute(
          'SELECT live_message_id, room_id, actual_room_id, socket_type, received_at FROM messages WHERE message_id = ?',
          [messageId]
        );
        
        if (messages.length === 0) {
          return res.status(404).json({
            code: 404,
            message: '消息不存在'
          });
        }
        
        const msg = messages[0];
        
        // 优先使用 live_message_id 精确查询
        if (msg.live_message_id) {
          const [rawMessages] = await db.pool.execute(
            'SELECT data FROM live_messages WHERE id = ?',
            [msg.live_message_id]
          );
          
          if (rawMessages.length > 0) {
            rawData = rawMessages[0].data;
          }
        }
        
        // 如果没有 live_message_id 或没查到，使用时间范围模糊匹配
        if (!rawData) {
          const receivedAt = new Date(msg.received_at);
          const startTime = new Date(receivedAt.getTime() - 5000); // 前5秒
          const endTime = new Date(receivedAt.getTime() + 5000);   // 后5秒
          
          logger.debug('尝试时间范围匹配: %s ~ %s', startTime.toISOString(), endTime.toISOString());
          
          const roomId = msg.actual_room_id || msg.room_id;
          const [rawMessages] = await db.pool.execute(
            'SELECT id, data, created_at FROM live_messages WHERE (actual_room_id = ? OR (actual_room_id IS NULL AND room_id = ?)) AND method = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT 1',
            [roomId, roomId, msg.socket_type, startTime, endTime]
          );
          
          if (rawMessages.length > 0) {
            rawData = rawMessages[0].data;
            logger.debug('找到原始数据, live_message_id: %d, 时间差: %dms', 
              rawMessages[0].id, 
              Math.abs(new Date(rawMessages[0].created_at).getTime() - receivedAt.getTime()));
          } else {
            logger.warn('未找到原始数据: room=%s, method=%s, time=%s', 
              msg.actual_room_id || msg.room_id, msg.socket_type, msg.received_at);
          }
        }
      }
      
      if (!rawData) {
        return res.status(404).json({
          code: 404,
          message: '未找到原始数据'
        });
      }
      
      res.json({
        code: 200,
        message: '查询成功',
        data: {
          rawData
        }
      });
      
    } catch (error) {
      logger.error('查询原始数据失败: %s', error.message);
      res.status(500).json({
        code: 500,
        message: '查询失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取示例消息数据（用于配置解析模板）
   */
  async getSampleData(req, res) {
    try {
      const { socket_type, limit = 10 } = req.query;
      
      if (!socket_type) {
        return res.status(400).json({
          code: 400,
          message: '请提供 socket_type 参数'
        });
      }
      
      // 从 live_messages 表查询最近的示例数据
      const [messages] = await db.pool.execute(
        'SELECT data FROM live_messages WHERE method = ? ORDER BY id DESC LIMIT ?',
        [socket_type, parseInt(limit)]
      );
      
      // 提取 data 字段
      const dataList = messages.map(msg => {
        try {
          return typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
        } catch (e) {
          return msg.data;
        }
      });
      
      res.json({
        code: 200,
        message: '查询成功',
        data: dataList
      });
      
    } catch (error) {
      logger.error('获取示例数据失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '查询失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取消息类型统计
   */
  async getMessageStats(req, res) {
    try {
      const { roomId } = req.params;
      
      const [rows] = await db.pool.execute(
        `SELECT message_type, COUNT(*) as count 
         FROM live_messages 
         WHERE room_id = ? 
         GROUP BY message_type 
         ORDER BY count DESC`,
        [roomId]
      );
      
      res.json({
        code: 200,
        message: '查询成功',
        data: {
          stats: rows
        }
      });
      
    } catch (error) {
      logger.error('查询统计失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '查询失败',
        error: error.message
      });
    }
  }
  
  /**
   * 删除指定直播间的所有消息
   */
  async deleteMessages(req, res) {
    try {
      const { roomId } = req.params;
      
      const [result] = await db.pool.execute(
        'DELETE FROM live_messages WHERE room_id = ?',
        [roomId]
      );
      
      res.json({
        code: 200,
        message: '删除成功',
        data: {
          deletedCount: result.affectedRows
        }
      });
      
    } catch (error) {
      logger.error('删除消息失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '删除失败',
        error: error.message
      });
    }
  }
}

module.exports = new MessageController();
