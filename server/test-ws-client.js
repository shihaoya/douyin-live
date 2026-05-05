/**
 * WebSocket客户端测试脚本
 * 用于测试抖音直播消息的实时推送
 */

const WebSocket = require('ws');

// 配置
const ROOM_ID = '692509034937'; // 替换为你要监听的直播间ID
const WS_URL = `ws://localhost:5678/douyin-live/${ROOM_ID}`;

console.log(`🔗 正在连接到: ${WS_URL}\n`);

// 创建WebSocket连接
const ws = new WebSocket(WS_URL);

// 连接成功
ws.on('open', () => {
  console.log('✅ WebSocket连接成功\n');
});

// 接收消息
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    // 格式化输出
    if (message.type === 'system') {
      // 系统消息
      console.log(`📢 [系统] ${message.event}: ${message.message}`);
    } else {
      // 直播消息
      const timestamp = new Date(message.timestamp).toLocaleTimeString();
      const type = message.type || message.method || 'Unknown';
      
      console.log(`\n[${timestamp}] 📨 ${type}`);
      
      // 根据类型显示不同的信息
      if (message.data) {
        const data = message.data;
        
        if (data.user && data.content) {
          // 弹幕消息
          const nickname = data.user.nickName || data.user.name || '未知用户';
          console.log(`   💬 ${nickname}: ${data.content}`);
        } else if (data.user && data.gift) {
          // 礼物消息
          const nickname = data.user.nickName || data.user.name || '未知用户';
          const giftName = data.gift.name || '未知礼物';
          const count = data.repeatCount || data.totalCount || data.count || 1;
          const diamondValue = data.gift.diamond_count || 0;
          console.log(`   🎁 ${nickname} 赠送了 ${giftName} x${count} (价值${diamondValue}抖币)`);
        } else if (data.user) {
          // 进场消息
          const nickname = data.user.nickName || data.user.name || '未知用户';
          console.log(`   🚪 ${nickname} 进入直播间`);
        } else if (data.likeCount) {
          // 点赞消息
          console.log(`   ❤️ 点赞数: ${data.likeCount}`);
        } else {
          // 其他消息，显示简要信息
          console.log(`   📊 数据:`, JSON.stringify(data).substring(0, 200));
        }
      }
    }
  } catch (error) {
    console.error('❌ 解析消息失败:', error.message);
    console.log('原始数据:', data.toString().substring(0, 200));
  }
});

// 连接关闭
ws.on('close', (code, reason) => {
  console.log(`\n⚠️ 连接已关闭 | Code: ${code}, Reason: ${reason.toString()}`);
});

// 连接错误
ws.on('error', (error) => {
  console.error(`\n❌ 连接错误: ${error.message}`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 正在断开连接...');
  ws.close();
  process.exit(0);
});

console.log('按 Ctrl+C 断开连接\n');
