const db = require('../config/database');
const logger = require('../config/logger');

class MessageProcessorController {
  /**
   * 获取所有消息处理器配置
   */
  async getProcessors(req, res) {
    try {
      const [rows] = await db.pool.execute(
        'SELECT * FROM message_type_configs ORDER BY sort_order DESC'
      );
      
      res.json({
        code: 200,
        message: '查询成功',
        data: { processors: rows }
      });
    } catch (error) {
      logger.error('查询处理器配置失败:', error.message);
      res.json({ code: 500, message: '查询失败', data: { error: error.message } });
    }
  }

  /**
   * 获取所有出现过的 Socket 类型
   */
  async getSocketTypes(req, res) {
    try {
      // 从 live_messages 表中获取所有唯一的 method
      const [rows] = await db.pool.execute(
        'SELECT DISTINCT method as socket_type FROM live_messages ORDER BY method'
      );
      
      // 从 message_type_configs 表中获取已配置的 socket_type
      const [configs] = await db.pool.execute(
        'SELECT DISTINCT socket_type FROM message_type_configs'
      );
      
      // 合并并去重
      const typeSet = new Set();
      rows.forEach(row => typeSet.add(row.socket_type));
      configs.forEach(row => typeSet.add(row.socket_type));
      
      const socketTypes = Array.from(typeSet).sort();
      
      res.json({
        code: 200,
        message: '查询成功',
        data: { socketTypes }
      });
    } catch (error) {
      logger.error('查询 Socket 类型失败:', error.message);
      res.json({ code: 500, message: '查询失败', data: { error: error.message } });
    }
  }

  /**
   * 添加消息处理器配置
   */
  async addProcessor(req, res) {
    try {
      const { socket_type, message_type, display_name, color, description_template } = req.body;
      
      if (!socket_type || !message_type) {
        return res.status(400).json({ code: 400, message: 'socket_type 和 message_type 不能为空' });
      }

      // 检查是否已存在
      const [existing] = await db.pool.execute(
        'SELECT id FROM message_type_configs WHERE socket_type = ?',
        [socket_type]
      );

      if (existing.length > 0) {
        return res.status(400).json({ code: 400, message: '该 Socket 类型已存在配置' });
      }

      await db.pool.execute(
        `INSERT INTO message_type_configs 
         (socket_type, message_type, display_name, color, description_template, is_enabled) 
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [socket_type, message_type, display_name || message_type, color || '#909399', description_template || null]
      );

      res.json({
        code: 200,
        message: '添加成功'
      });
    } catch (error) {
      // 处理唯一约束冲突
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ 
          code: 400, 
          message: '该 Socket 类型已存在配置，不能重复添加' 
        });
      }
      
      logger.error('添加处理器配置失败:', error.message);
      res.json({ code: 500, message: '添加失败', data: { error: error.message } });
    }
  }

  /**
   * 更新消息处理器配置
   */
  async updateProcessor(req, res) {
    try {
      const { id } = req.params;
      const { message_type, display_name, color, description_template, is_enabled } = req.body;

      const fields = [];
      const values = [];

      if (message_type !== undefined) {
        fields.push('message_type = ?');
        values.push(message_type);
      }
      if (display_name !== undefined) {
        fields.push('display_name = ?');
        values.push(display_name);
      }
      if (color !== undefined) {
        fields.push('color = ?');
        values.push(color);
      }
      if (description_template !== undefined) {
        fields.push('description_template = ?');
        values.push(description_template);
      }
      if (is_enabled !== undefined) {
        fields.push('is_enabled = ?');
        values.push(is_enabled);
      }

      if (fields.length === 0) {
        return res.status(400).json({ code: 400, message: '没有要更新的字段' });
      }

      values.push(id);
      await db.pool.execute(
        `UPDATE message_type_configs SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      res.json({
        code: 200,
        message: '更新成功'
      });
    } catch (error) {
      logger.error('更新处理器配置失败:', error.message);
      res.json({ code: 500, message: '更新失败', data: { error: error.message } });
    }
  }

  /**
   * 删除消息处理器配置
   */
  async deleteProcessor(req, res) {
    try {
      const { id } = req.params;
      
      await db.pool.execute(
        'DELETE FROM message_type_configs WHERE id = ?',
        [id]
      );

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除处理器配置失败:', error.message);
      res.json({ code: 500, message: '删除失败', data: { error: error.message } });
    }
  }

  /**
   * 测试解析模板
   */
  async testTemplate(req, res) {
    try {
      const { template, sample_data } = req.body;
      
      if (!template || !sample_data) {
        return res.status(400).json({ code: 400, message: 'template 和 sample_data 不能为空' });
      }

      let data;
      try {
        data = typeof sample_data === 'string' ? JSON.parse(sample_data) : sample_data;
      } catch (e) {
        return res.status(400).json({ code: 400, message: 'sample_data 不是有效的 JSON' });
      }

      // 解析模板
      const result = this.parseTemplate(template, data);

      res.json({
        code: 200,
        message: '解析成功',
        data: {
          result: result,
          success: result !== null
        }
      });
    } catch (error) {
      logger.error('测试模板失败: %s', error.message);
      logger.error(error.stack);
      res.json({
        code: 500,
        message: '测试失败',
        data: {
          result: null,
          success: false,
          error: error.message
        }
      });
    }
  }

  /**
   * 根据模板解析数据
   * @param {string} template - 模板字符串，如 "消息：{data.content.message}"
   * @param {object} data - 原始数据对象
   * @returns {string|null} - 解析结果或null
   */
  /**
   * 解析模板（支持简单表达式和映射引用）
   */
  parseTemplate(template, data, mapping = null) {
    if (!template || !data) return null;

    try {
      // 匹配 {xxx} 格式的占位符（可能包含表达式或映射引用）
      const result = template.replace(/\{([^}]+)\}/g, (match, expression) => {
        const expr = expression.trim();
        
        // 检查是否是映射引用: field:map_key
        if (expr.includes(':')) {
          const parts = expr.split(':');
          if (parts.length === 2) {
            const fieldPath = parts[0].trim();
            const mapKey = parts[1].trim();
            return this.resolveMapping(fieldPath, mapKey, data, mapping);
          }
        }
        
        // 检查是否是三元表达式: condition ? trueValue : falseValue
        if (expr.includes('?') && expr.includes(':')) {
          return this.evaluateExpression(expr, data);
        }
        
        // 普通路径访问: user.nickName
        return this.getValueByPath(expr, data, match);
      });

      return result;
    } catch (error) {
      logger.error('模板解析错误: %s, 模板: %s', error.message, template);
      return null;
    }
  }
  
  /**
   * 从模板中提取所有映射键名
   * 例如: {action:map_action} -> ['map_action']
   */
  extractMappingKeys(template) {
    if (!template) return [];
    
    const keys = new Set();
    const regex = /\{([^}]+:[^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const expression = match[1].trim();
      const parts = expression.split(':');
      if (parts.length === 2) {
        const mapKey = parts[1].trim();
        // 排除三元表达式中的冒号（如 {a == 1 ? 'x' : 'y'}）
        if (mapKey && !mapKey.includes('?') && !mapKey.includes(' ')) {
          keys.add(mapKey);
        }
      }
    }
    
    return Array.from(keys);
  }
  
  /**
   * 通过路径获取值
   */
  getValueByPath(path, data, defaultValue) {
    const paths = path.split('.');
    let current = data;

    for (const p of paths) {
      if (current === null || current === undefined) {
        return defaultValue; // 保持原样
      }
      current = current[p];
    }

    // 如果结果是对象，转为JSON字符串
    if (typeof current === 'object') {
      return JSON.stringify(current);
    }

    return current != null ? String(current) : defaultValue;
  }
  
  /**
   * 解析映射引用
   * @param {string} fieldPath - 字段路径，如 action
   * @param {string} mapKey - 映射键名，如 map_action
   * @param {object} data - 原始数据
   * @param {object|null} mapping - 映射配置
   */
  resolveMapping(fieldPath, mapKey, data, mapping) {
    // 如果没有提供映射配置，返回原表达式
    if (!mapping || typeof mapping !== 'object') {
      return `{${fieldPath}:${mapKey}}`;
    }
    
    // 获取字段的实际值
    const fieldValue = this.getValueByPath(fieldPath, data, null);
    if (fieldValue === null) {
      return `{${fieldPath}:${mapKey}}`;
    }
    
    // 从映射配置中查找
    const mapConfig = mapping[mapKey];
    if (!mapConfig || typeof mapConfig !== 'object') {
      return `{${fieldPath}:${mapKey}}`;
    }
    
    // 查找对应的映射值
    const mappedValue = mapConfig[fieldValue];
    return mappedValue != null ? String(mappedValue) : fieldValue;
  }
  
  /**
   * 计算表达式（支持三元表达式和比较运算）
   */
  evaluateExpression(expr, data) {
    try {
      // 解析三元表达式: condition ? trueExpr : falseExpr
      const questionIndex = expr.indexOf('?');
      const colonIndex = expr.lastIndexOf(':');
      
      if (questionIndex === -1 || colonIndex === -1) {
        return this.getValueByPath(expr, data, expr);
      }
      
      const condition = expr.substring(0, questionIndex).trim();
      const trueExpr = expr.substring(questionIndex + 1, colonIndex).trim();
      const falseExpr = expr.substring(colonIndex + 1).trim();
      
      // 评估条件
      const conditionResult = this.evaluateCondition(condition, data);
      
      // 递归评估结果表达式（支持嵌套三元）
      if (conditionResult) {
        return trueExpr.includes('?') ? this.evaluateExpression(trueExpr, data) : this.getValueByPath(trueExpr, data, trueExpr);
      } else {
        return falseExpr.includes('?') ? this.evaluateExpression(falseExpr, data) : this.getValueByPath(falseExpr, data, falseExpr);
      }
    } catch (error) {
      logger.error('表达式评估失败: %s', error.message);
      return expr; // 失败时返回原表达式
    }
  }
  
  /**
   * 评估条件表达式
   */
  evaluateCondition(condition, data) {
    // 支持的操作符: ==, !=, >, <, >=, <=
    const operators = ['==', '!=', '>=', '<=', '>', '<'];
    
    for (const op of operators) {
      const index = condition.indexOf(op);
      if (index !== -1) {
        const leftExpr = condition.substring(0, index).trim();
        const rightExpr = condition.substring(index + op.length).trim();
        
        // 获取左右值
        const leftValue = this.getExpressionValue(leftExpr, data);
        const rightValue = this.getExpressionValue(rightExpr, data);
        
        // 执行比较
        switch (op) {
          case '==': return leftValue == rightValue;
          case '!=': return leftValue != rightValue;
          case '>': return Number(leftValue) > Number(rightValue);
          case '<': return Number(leftValue) < Number(rightValue);
          case '>=': return Number(leftValue) >= Number(rightValue);
          case '<=': return Number(leftValue) <= Number(rightValue);
        }
      }
    }
    
    // 如果没有操作符，直接返回值并转为布尔
    const value = this.getExpressionValue(condition, data);
    return Boolean(value);
  }
  
  /**
   * 获取表达式的值（可能是路径或字面量）
   */
  getExpressionValue(expr, data) {
    // 如果是数字字面量
    if (/^-?\d+$/.test(expr)) {
      return parseInt(expr);
    }
    // 如果是浮点数字面量
    if (/^-?\d+\.\d+$/.test(expr)) {
      return parseFloat(expr);
    }
    // 如果是字符串字面量（单引号或双引号）
    if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
      return expr.slice(1, -1);
    }
    // 否则当作路径处理
    return this.getValueByPath(expr, data, expr);
  }

  /**
   * 重新处理历史消息
   */
  async reprocessHistory(req, res) {
    try {
      const { room_id, start_time, end_time, limit = 1000 } = req.body;
      
      if (!room_id) {
        return res.status(400).json({ code: 400, message: 'room_id 不能为空' });
      }

      // 查询符合条件的原始消息
      let query = 'SELECT * FROM live_messages WHERE room_id = ?';
      const params = [room_id];
      
      if (start_time) {
        query += ' AND created_at >= ?';
        params.push(start_time);
      }
      
      if (end_time) {
        query += ' AND created_at <= ?';
        params.push(end_time);
      }
      
      query += ' ORDER BY created_at ASC LIMIT ?';
      params.push(limit);
      
      const [messages] = await db.pool.execute(query, params);
      
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // 逐条处理
      for (const msg of messages) {
        try {
          // 检查是否已经处理过（通过message_id判断）
          const method = msg.method;
          const [existing] = await db.pool.execute(
            'SELECT id FROM messages WHERE room_id = ? AND socket_type = ? AND received_at = ?',
            [msg.room_id, method, msg.created_at]
          );
          
          if (existing.length > 0) {
            skippedCount++;
            continue;
          }
          
          // 查询配置
          const [configs] = await db.pool.execute(
            'SELECT * FROM message_type_configs WHERE socket_type = ? AND is_enabled = TRUE',
            [method]
          );
          
          if (configs.length === 0) {
            skippedCount++;
            continue;
          }
          
          const config = configs[0];
          if (!config.description_template) {
            skippedCount++;
            continue;
          }
          
          // 解析数据
          const rawData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          
          // 从模板中提取所有映射键名
          const mappingKeys = this.extractMappingKeys(config.description_template);
          
          // 查询所有需要的映射配置
          let mappings = {};
          if (mappingKeys.length > 0) {
            // 动态生成占位符: (?, ?, ?)
            const placeholders = mappingKeys.map(() => '?').join(', ');
            const [mappingConfigs] = await db.pool.execute(
              `SELECT m.mapping_key, vmi.source_value, vmi.target_value FROM value_mapping_items vmi JOIN value_mappings m ON vmi.mapping_id = m.id WHERE m.mapping_key IN (${placeholders}) AND m.is_enabled = TRUE`,
              mappingKeys
            );
            
            // 组织映射数据: { map_action: { '1': '进入', '2': '退出' } }
            mappingConfigs.forEach(item => {
              if (!mappings[item.mapping_key]) {
                mappings[item.mapping_key] = {};
              }
              mappings[item.mapping_key][item.source_value] = item.target_value;
            });
          }
          
          const description = this.parseTemplate(config.description_template, rawData, mappings);
          
          if (description === null) {
            skippedCount++;
            continue;
          }
          
          // 提取用户信息
          const userId = rawData?.user?.id || rawData?.user?.uid || '';
          const userNickname = rawData?.user?.nickName || rawData?.user?.name || '';
          const userLevel = rawData?.user?.pay_grade?.level || 0;
          const fansLevel = rawData?.user?.fans_club?.level || 0;
          
          // 提取礼物信息
          const giftId = rawData?.gift?.id || rawData?.giftStruct?.id || null;
          const giftName = rawData?.gift?.name || rawData?.giftStruct?.name || '';
          const giftCount = rawData?.repeatCount || rawData?.totalCount || rawData?.count || 1;
          const giftDiamondValue = rawData?.gift?.diamond_count || rawData?.giftStruct?.diamondCount || 0;
          const comboCount = rawData?.combo_count || 1;
          const groupId = rawData?.group_id || rawData?.groupId || null;
          
          // 生成唯一消息ID
          const messageId = `${msg.room_id}_${method}_${new Date(msg.created_at).getTime()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // 保存
          await db.pool.execute(
            `INSERT INTO messages (
              room_id, socket_type, message_type, 
              user_id, user_nickname, user_level, fans_level,
              content, 
              gift_id, gift_name, gift_count, gift_diamond_value, combo_count, group_id,
              description, message_id, received_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              msg.room_id,
              method,
              config.message_type,
              userId,
              userNickname,
              userLevel,
              fansLevel,
              rawData?.content || '',
              giftId,
              giftName,
              giftCount,
              giftDiamondValue,
              comboCount,
              groupId,
              description,
              messageId,
              msg.created_at
            ]
          );
          
          processedCount++;
        } catch (error) {
          logger.error('处理消息 %d 失败: %s', msg.id, error.message);
          errorCount++;
        }
      }
      
      res.json({
        code: 200,
        message: '处理完成',
        data: {
          total: messages.length,
          processed: processedCount,
          skipped: skippedCount,
          errors: errorCount
        }
      });
    } catch (error) {
      logger.error('重新处理历史消息失败:', error.message);
      res.json({ code: 500, message: '处理失败', data: { error: error.message } });
    }
  }
}

module.exports = new MessageProcessorController();
