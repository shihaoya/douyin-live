const db = require('../config/database');
const logger = require('../config/logger');

/**
 * 值映射管理控制器
 */
class ValueMappingController {
  
  /**
   * 获取所有映射配置
   */
  static async getAllMappings(req, res) {
    try {
      const [mappings] = await db.pool.execute(`
        SELECT 
          m.id,
          m.mapping_key,
          m.mapping_name,
          m.description,
          m.is_enabled,
          m.created_at,
          COUNT(vmi.id) as item_count
        FROM value_mappings m
        LEFT JOIN value_mapping_items vmi ON m.id = vmi.mapping_id
        GROUP BY m.id
        ORDER BY m.created_at DESC
      `);
      
      res.json({
        code: 200,
        message: '查询成功',
        data: mappings
      });
    } catch (error) {
      logger.error('获取映射列表失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '查询失败'
      });
    }
  }
  
  /**
   * 获取单个映射的详细信息（包含映射项）
   */
  static async getMappingDetail(req, res) {
    try {
      const { id } = req.params;
      
      // 获取映射配置
      const [mappings] = await db.pool.execute(
        'SELECT * FROM value_mappings WHERE id = ?',
        [id]
      );
      
      if (mappings.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '映射配置不存在'
        });
      }
      
      // 获取映射项
      const [items] = await db.pool.execute(
        'SELECT * FROM value_mapping_items WHERE mapping_id = ? ORDER BY sort_order, id',
        [id]
      );
      
      res.json({
        code: 200,
        message: '查询成功',
        data: {
          ...mappings[0],
          items
        }
      });
    } catch (error) {
      logger.error('获取映射详情失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '查询失败'
      });
    }
  }
  
  /**
   * 创建映射配置
   */
  static async createMapping(req, res) {
    try {
      const { mapping_key, mapping_name, description, items } = req.body;
      
      if (!mapping_key || !mapping_name) {
        return res.status(400).json({
          code: 400,
          message: 'mapping_key 和 mapping_name 不能为空'
        });
      }
      
      // 检查 key 是否已存在
      const [existing] = await db.pool.execute(
        'SELECT id FROM value_mappings WHERE mapping_key = ?',
        [mapping_key]
      );
      
      if (existing.length > 0) {
        return res.status(409).json({
          code: 409,
          message: '映射键名已存在'
        });
      }
      
      // 开启事务
      const connection = await db.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 插入映射配置
        const [result] = await connection.execute(
          'INSERT INTO value_mappings (mapping_key, mapping_name, description) VALUES (?, ?, ?)',
          [mapping_key, mapping_name, description || null]
        );
        
        const mappingId = result.insertId;
        
        // 插入映射项
        if (items && Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            await connection.execute(
              'INSERT INTO value_mapping_items (mapping_id, source_value, target_value, sort_order, remark) VALUES (?, ?, ?, ?, ?)',
              [mappingId, item.source_value, item.target_value, item.sort_order || 0, item.remark || null]
            );
          }
        }
        
        await connection.commit();
        
        res.json({
          code: 200,
          message: '创建成功',
          data: { id: mappingId }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('创建映射配置失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '创建失败'
      });
    }
  }
  
  /**
   * 更新映射配置
   */
  static async updateMapping(req, res) {
    try {
      const { id } = req.params;
      const { mapping_name, description, is_enabled, items } = req.body;
      
      // 更新映射配置
      await db.pool.execute(
        'UPDATE value_mappings SET mapping_name = ?, description = ?, is_enabled = ? WHERE id = ?',
        [mapping_name, description || null, is_enabled !== undefined ? is_enabled : true, id]
      );
      
      // 如果提供了 items，更新映射项
      if (items && Array.isArray(items)) {
        const connection = await db.pool.getConnection();
        await connection.beginTransaction();
        
        try {
          // 删除旧的映射项
          await connection.execute('DELETE FROM value_mapping_items WHERE mapping_id = ?', [id]);
          
          // 插入新的映射项
          for (const item of items) {
            await connection.execute(
              'INSERT INTO value_mapping_items (mapping_id, source_value, target_value, sort_order, remark) VALUES (?, ?, ?, ?, ?)',
              [id, item.source_value, item.target_value, item.sort_order || 0, item.remark || null]
            );
          }
          
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }
      
      res.json({
        code: 200,
        message: '更新成功'
      });
    } catch (error) {
      logger.error('更新映射配置失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '更新失败'
      });
    }
  }
  
  /**
   * 删除映射配置
   */
  static async deleteMapping(req, res) {
    try {
      const { id } = req.params;
      
      // 检查是否有消息类型配置引用此映射
      const [references] = await db.pool.execute(
        'SELECT COUNT(*) as count FROM message_type_configs WHERE mapping_key = (SELECT mapping_key FROM value_mappings WHERE id = ?)',
        [id]
      );
      
      if (references[0].count > 0) {
        return res.status(400).json({
          code: 400,
          message: '该映射正在被使用，无法删除'
        });
      }
      
      await db.pool.execute('DELETE FROM value_mappings WHERE id = ?', [id]);
      
      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除映射配置失败:', error.message);
      res.status(500).json({
        code: 500,
        message: '删除失败'
      });
    }
  }
}

module.exports = ValueMappingController;
