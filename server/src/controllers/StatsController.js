const db = require('../config/database');
const logger = require('../config/logger');

class StatsController {
  /**
   * 获取直播间统计数据
   */
  static async getRoomStats(req, res) {
    try {
      const { roomId } = req.params;
      const { startTime, endTime } = req.query;
      
      if (!roomId) {
        return res.status(400).json({ code: 400, message: '直播间ID不能为空' });
      }
      
      logger.info(`📊 获取直播间 ${roomId} 的统计数据`);
      
      // 构建时间过滤条件
      let timeFilter = '';
      const params = [roomId];
      
      if (startTime) {
        timeFilter += ' AND received_at >= ?';
        params.push(startTime);
      }
      if (endTime) {
        timeFilter += ' AND received_at <= ?';
        params.push(endTime);
      }
      
      // 1. 用户贡献排行榜（按礼物价值）- 关联礼物表
      const [userContribution] = await db.pool.execute(
        `SELECT m.user_nickname, m.user_id,
                SUM(g.diamond_count * m.gift_count) as total_diamonds,
                COUNT(*) as gift_times
         FROM messages m
         LEFT JOIN gifts g ON m.gift_id = g.gift_id
         WHERE m.room_id = ? AND m.message_type = '礼物' AND m.user_nickname != ''${timeFilter}
         GROUP BY m.user_id, m.user_nickname
         ORDER BY total_diamonds DESC
         LIMIT 20`,
        [roomId, ...params.slice(1)]
      );
      
      // 2. 礼物类型统计 - 关联礼物表
      const [giftTypes] = await db.pool.execute(
        `SELECT m.gift_name, 
                COUNT(*) as times,
                SUM(m.gift_count) as total_count,
                SUM(g.diamond_count * m.gift_count) as total_diamonds
         FROM messages m
         LEFT JOIN gifts g ON m.gift_id = g.gift_id
         WHERE m.room_id = ? AND m.message_type = '礼物' AND m.gift_name != ''${timeFilter}
         GROUP BY m.gift_name
         ORDER BY total_diamonds DESC
         LIMIT 15`,
        [roomId, ...params.slice(1)]
      );
      
      // 3. 点赞统计
      const [likeStats] = await db.pool.execute(
        `SELECT user_nickname, user_id,
                COUNT(*) as like_times,
                SUM(gift_count) as total_likes
         FROM messages 
         WHERE room_id = ? AND message_type = '点赞' AND user_nickname != ''${timeFilter}
         GROUP BY user_id, user_nickname
         ORDER BY total_likes DESC
         LIMIT 15`,
        [roomId, ...params.slice(1)]
      );
      
      // 总点赞数
      const [totalLikes] = await db.pool.execute(
        `SELECT COALESCE(SUM(gift_count), 0) as total
         FROM messages 
         WHERE room_id = ? AND message_type = '点赞'${timeFilter}`,
        [roomId, ...params.slice(1)]
      );
      
      // 4. 评论统计
      const [commentStats] = await db.pool.execute(
        `SELECT user_nickname, user_id, COUNT(*) as comment_count
         FROM messages 
         WHERE room_id = ? AND message_type = '弹幕' AND user_nickname != ''${timeFilter}
         GROUP BY user_id, user_nickname
         ORDER BY comment_count DESC
         LIMIT 15`,
        [roomId, ...params.slice(1)]
      );
      
      // 5. 收入曲线（按小时统计）- 关联礼物表
      const [revenueCurve] = await db.pool.execute(
        `SELECT 
          DATE_FORMAT(m.received_at, '%Y-%m-%d %H:00:00') as time_slot,
          COUNT(*) as gift_times,
          SUM(g.diamond_count * m.gift_count) as total_diamonds
         FROM messages m
         LEFT JOIN gifts g ON m.gift_id = g.gift_id
         WHERE m.room_id = ? AND m.message_type = '礼物'${timeFilter}
         GROUP BY time_slot
         ORDER BY time_slot ASC`,
        [roomId, ...params.slice(1)]
      );
      
      // 6. 进场统计
      const [enterStats] = await db.pool.execute(
        `SELECT 
          COUNT(DISTINCT user_id) as unique_visitors,
          COUNT(*) as total_enters
         FROM messages
         WHERE room_id = ? AND message_type = '进入直播间'${timeFilter}`,
        [roomId, ...params.slice(1)]
      );
      
      res.json({
        code: 200,
        message: 'success',
        data: {
          userContribution,
          giftTypes,
          likeStats,
          totalLikes: totalLikes[0]?.total || 0,
          commentStats,
          revenueCurve,
          enterStats: enterStats[0] || { unique_visitors: 0, total_enters: 0 }
        }
      });
    } catch (error) {
      logger.error('获取统计数据失败:', error);
      res.status(500).json({ code: 500, message: '获取统计数据失败' });
    }
  }
  
  /**
   * 获取所有直播间列表（用于下拉选择）
   */
  static async getRoomList(req, res) {
    try {
      const [rooms] = await db.pool.execute(
        `SELECT DISTINCT m.room_id, rc.room_name 
         FROM messages m
         LEFT JOIN room_configs rc ON m.room_id = rc.room_id
         ORDER BY m.room_id`
      );
      
      res.json({
        code: 200,
        message: 'success',
        data: rooms
      });
    } catch (error) {
      logger.error('获取直播间列表失败:', error);
      res.status(500).json({ code: 500, message: '获取直播间列表失败' });
    }
  }
  
  /**
   * 获取用户礼物详情
   */
  static async getUserGiftDetails(req, res) {
    try {
      const { roomId, userId } = req.query;
      const { startTime, endTime } = req.query;
      
      let timeFilter = '';
      const params = [roomId, userId];
      
      if (startTime) {
        timeFilter += ' AND m.received_at >= ?';
        params.push(startTime);
      }
      if (endTime) {
        timeFilter += ' AND m.received_at <= ?';
        params.push(endTime);
      }
      
      const [details] = await db.pool.execute(
        `SELECT m.*, g.diamond_count, g.name as gift_full_name
         FROM messages m
         LEFT JOIN gifts g ON m.gift_id = g.gift_id
         WHERE m.room_id = ? AND m.user_id = ? AND m.message_type = '礼物'${timeFilter}
         ORDER BY m.received_at DESC
         LIMIT 100`,
        params
      );
      
      res.json({
        code: 200,
        message: 'success',
        data: details
      });
    } catch (error) {
      logger.error('获取用户礼物详情失败:', error);
      res.status(500).json({ code: 500, message: '获取详情失败' });
    }
  }
  
  /**
   * 获取评论详情
   */
  static async getCommentDetails(req, res) {
    try {
      const { roomId, userId } = req.query;
      const { startTime, endTime } = req.query;
      
      let timeFilter = '';
      const params = [roomId, userId];
      
      if (startTime) {
        timeFilter += ' AND received_at >= ?';
        params.push(startTime);
      }
      if (endTime) {
        timeFilter += ' AND received_at <= ?';
        params.push(endTime);
      }
      
      const [details] = await db.pool.execute(
        `SELECT *
         FROM messages
         WHERE room_id = ? AND user_id = ? AND message_type = '弹幕'${timeFilter}
         ORDER BY received_at DESC
         LIMIT 100`,
        params
      );
      
      res.json({
        code: 200,
        message: 'success',
        data: details
      });
    } catch (error) {
      logger.error('获取评论详情失败:', error);
      res.status(500).json({ code: 500, message: '获取详情失败' });
    }
  }
  
  /**
   * 获取礼物类型详情（谁送了这个礼物）
   */
  static async getGiftTypeDetails(req, res) {
    try {
      const { roomId, giftName } = req.query;
      const { startTime, endTime } = req.query;
      
      let timeFilter = '';
      const params = [roomId, giftName];
      
      if (startTime) {
        timeFilter += ' AND m.received_at >= ?';
        params.push(startTime);
      }
      if (endTime) {
        timeFilter += ' AND m.received_at <= ?';
        params.push(endTime);
      }
      
      const [details] = await db.pool.execute(
        `SELECT m.user_nickname, m.user_id, m.gift_count, g.diamond_count, 
                (g.diamond_count * m.gift_count) as total_diamonds, m.received_at
         FROM messages m
         LEFT JOIN gifts g ON m.gift_id = g.gift_id
         WHERE m.room_id = ? AND m.gift_name = ? AND m.message_type = '礼物'${timeFilter}
         ORDER BY m.received_at DESC
         LIMIT 100`,
        params
      );
      
      res.json({
        code: 200,
        message: 'success',
        data: details
      });
    } catch (error) {
      logger.error('获取礼物类型详情失败:', error);
      res.status(500).json({ code: 500, message: '获取详情失败' });
    }
  }
  
  /**
   * 获取点赞详情（用户在什么时候点了多少赞）
   */
  static async getLikeDetails(req, res) {
    try {
      const { roomId, userId } = req.query;
      const { startTime, endTime } = req.query;
      
      let timeFilter = '';
      const params = [roomId, userId];
      
      if (startTime) {
        timeFilter += ' AND received_at >= ?';
        params.push(startTime);
      }
      if (endTime) {
        timeFilter += ' AND received_at <= ?';
        params.push(endTime);
      }
      
      const [details] = await db.pool.execute(
        `SELECT user_nickname, user_id, gift_count as like_count, received_at
         FROM messages
         WHERE room_id = ? AND user_id = ? AND message_type = '点赞'${timeFilter}
         ORDER BY received_at DESC
         LIMIT 100`,
        params
      );
      
      res.json({
        code: 200,
        message: 'success',
        data: details
      });
    } catch (error) {
      logger.error('获取点赞详情失败:', error);
      res.status(500).json({ code: 500, message: '获取详情失败' });
    }
  }
}

module.exports = StatsController;
