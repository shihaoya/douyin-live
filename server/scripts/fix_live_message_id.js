/**
 * 修复历史数据的 live_message_id 关联
 * 
 * 使用方法：
 * node scripts/fix_live_message_id.js
 */

const db = require('../src/config/database');
const logger = require('../src/config/logger');

async function fixLiveMessageId() {
  try {
    console.log('开始修复 live_message_id 关联...');
    
    // 查询所有 live_message_id 为 NULL 的记录
    const [messages] = await db.pool.execute(
      'SELECT message_id, room_id, actual_room_id, socket_type, received_at FROM messages WHERE live_message_id IS NULL'
    );
    
    console.log(`找到 ${messages.length} 条需要修复的记录`);
    
    let fixedCount = 0;
    let notFoundCount = 0;
    
    for (const msg of messages) {
      try {
        const receivedAt = new Date(msg.received_at);
        const startTime = new Date(receivedAt.getTime() - 5000); // 前5秒
        const endTime = new Date(receivedAt.getTime() + 5000);   // 后5秒
        
        console.log(`处理: ${msg.message_id}`);
        console.log(`  room_id: ${msg.room_id}, actual_room_id: ${msg.actual_room_id}`);
        console.log(`  socket_type: ${msg.socket_type}, received_at: ${msg.received_at}`);
        console.log(`  时间范围: ${startTime.toISOString()} ~ ${endTime.toISOString()}`);
        
        // 查找对应的 live_message
        const roomId = msg.actual_room_id || msg.room_id;
        const [rawMessages] = await db.pool.execute(
          'SELECT id, created_at FROM live_messages WHERE (actual_room_id = ? OR (actual_room_id IS NULL AND room_id = ?)) AND method = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT 1',
          [roomId, roomId, msg.socket_type, startTime, endTime]
        );
        
        console.log(`  找到 ${rawMessages.length} 条匹配`);
        
        if (rawMessages.length > 0) {
          // 更新 live_message_id
          await db.pool.execute(
            'UPDATE messages SET live_message_id = ? WHERE message_id = ?',
            [rawMessages[0].id, msg.message_id]
          );
          fixedCount++;
          console.log(`  ✅ 已修复, live_message_id: ${rawMessages[0].id}`);
          
          if (fixedCount % 100 === 0) {
            console.log(`已修复 ${fixedCount} 条...`);
          }
        } else {
          notFoundCount++;
          console.log(`  ❌ 未找到匹配`);
        }
      } catch (error) {
        console.error(`处理消息 ${msg.message_id} 失败:`, error.message);
      }
    }
    
    console.log('\n修复完成！');
    console.log(`成功修复: ${fixedCount} 条`);
    console.log(`未找到匹配: ${notFoundCount} 条`);
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    // 关闭数据库连接
    setTimeout(() => {
      db.pool.end();
      process.exit(0);
    }, 1000);
  }
}

// 执行修复
fixLiveMessageId();
