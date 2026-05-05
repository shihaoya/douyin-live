const db = require('../config/database');
const logger = require('../config/logger');
const https = require('https');

class GiftController {
  /**
   * 从抖音API同步礼物数据
   */
  static async syncGifts(req, res) {
    try {
      logger.info('🔄 开始同步抖音礼物数据...');
      
      // 调用抖音礼物列表API
      const gifts = await new Promise((resolve, reject) => {
        const url = 'https://live.douyin.com/webcast/gift/list/?device_platform=webapp&aid=6383';
        https.get(url, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 10000
        }, (response) => {
          let data = '';
          response.on('data', (chunk) => data += chunk);
          response.on('end', () => {
            try {
              const json = JSON.parse(data);
              const giftList = json.data?.gifts || json.gifts || [];
              resolve(giftList);
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      
      if (!gifts || gifts.length === 0) {
        throw new Error('API返回数据为空');
      }
      
      logger.info(`📦 收到${gifts.length}个礼物，开始批量入库...`);
      
      // 分批处理，每批500个
      const batchSize = 500;
      let successCount = 0;
      
      for (let i = 0; i < gifts.length; i += batchSize) {
        const batch = gifts.slice(i, i + batchSize);
        
        // 构建批量INSERT语句
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, NOW())').join(', ');
        const sql = `
          INSERT INTO gifts (gift_id, name, diamond_count, image_url, description, updated_at) 
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            diamond_count = VALUES(diamond_count),
            image_url = VALUES(image_url),
            description = VALUES(description),
            updated_at = NOW()
        `;
        
        // 展平参数数组
        const params = batch.flatMap(gift => [
          gift.id,
          gift.name || '',
          gift.diamond_count || gift.diamondCount || 0,
          gift.icon?.url_list?.[0] || gift.icon?.uri || gift.gif_icon?.url_list?.[0] || gift.gif_icon?.uri || '',
          gift.describe || gift.description || ''
        ]);
        
        await db.pool.execute(sql, params);
        successCount += batch.length;
        
        logger.debug(`已处理 ${Math.min(i + batchSize, gifts.length)}/${gifts.length} 个礼物`);
      }
      
      logger.info(`✅ 礼物同步完成: 成功${successCount}个`);
      
      res.json({
        code: 200,
        message: '礼物同步成功',
        data: {
          total: gifts.length,
          syncedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('同步礼物失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '同步礼物失败'
      });
    }
  }
  
  /**
   * 获取礼物列表
   */
  static async getGifts(req, res) {
    try {
      const { page = 1, pageSize = 60, keyword, sortBy = 'diamond_count', order = 'DESC' } = req.query;
      const offset = (page - 1) * pageSize;
      
      let sql = 'SELECT * FROM gifts WHERE 1=1';
      const params = [];
      
      // 关键词搜索
      if (keyword) {
        sql += ' AND name LIKE ?';
        params.push(`%${keyword}%`);
      }
      
      // 排序
      const validSortFields = ['diamond_count', 'gift_id', 'name', 'updated_at'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'diamond_count';
      const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${sortField} ${sortOrder}`;
      
      // 分页
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), offset);
      
      const [gifts] = await db.pool.execute(sql, params);
      
      // 获取总数
      let countSql = 'SELECT COUNT(*) as total FROM gifts WHERE 1=1';
      const countParams = [];
      if (keyword) {
        countSql += ' AND name LIKE ?';
        countParams.push(`%${keyword}%`);
      }
      const [countResult] = await db.pool.execute(countSql, countParams);
      
      res.json({
        code: 200,
        message: 'success',
        data: {
          gifts,
          total: countResult[0].total,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    } catch (error) {
      logger.error('获取礼物列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取礼物列表失败'
      });
    }
  }
  
  /**
   * 删除礼物
   */
  static async deleteGift(req, res) {
    try {
      const { id } = req.params;
      
      await db.pool.execute('DELETE FROM gifts WHERE id = ?', [id]);
      
      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除礼物失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除礼物失败'
      });
    }
  }
}

module.exports = GiftController;
