/**
 * 开播监听器 API 测试脚本
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5678/api/rooms';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${color}%s\x1b[0m`, args.join(' '));
}

async function testStartMonitor() {
  log(colors.blue, '\n📡 测试1: 启动开播监听器');
  
  try {
    const response = await axios.post(`${BASE_URL}/monitor/start`, {
      interval: 30000 // 30秒检查一次（测试用）
    });
    
    log(colors.green, '✅ 启动成功:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      log(colors.yellow, '⚠️  监听器已在运行中');
      return true;
    }
    log(colors.red, '❌ 启动失败:', error.message);
    if (error.response) {
      log(colors.red, '   响应:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGetStatus() {
  log(colors.blue, '\n📊 测试2: 获取监听器状态');
  
  try {
    const response = await axios.get(`${BASE_URL}/monitor/status`);
    
    log(colors.green, '✅ 状态获取成功:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log(colors.red, '❌ 获取状态失败:', error.message);
    return false;
  }
}

async function testStopMonitor() {
  log(colors.blue, '\n🛑 测试3: 停止开播监听器');
  
  try {
    const response = await axios.post(`${BASE_URL}/monitor/stop`);
    
    log(colors.green, '✅ 停止成功:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log(colors.yellow, '⚠️  监听器未在运行');
      return true;
    }
    log(colors.red, '❌ 停止失败:', error.message);
    return false;
  }
}

async function testAddRoom() {
  log(colors.blue, '\n➕ 测试4: 添加直播间到监控列表');
  
  try {
    // 添加一个测试直播间
    const roomId = '79209611563'; // 示例房间ID
    
    const response = await axios.post(`${BASE_URL}/${roomId}/start`, {
      roomName: '测试直播间'
    });
    
    log(colors.green, '✅ 添加成功:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      log(colors.yellow, '⚠️  直播间已在监控中');
      return true;
    }
    log(colors.red, '❌ 添加失败:', error.message);
    return false;
  }
}

async function testGetRooms() {
  log(colors.blue, '\n📋 测试5: 获取所有直播间');
  
  try {
    const response = await axios.get(`${BASE_URL}`);
    
    log(colors.green, '✅ 获取成功，共', response.data.data.total, '个直播间');
    log(colors.cyan, JSON.stringify(response.data.data.rooms, null, 2));
    return true;
  } catch (error) {
    log(colors.red, '❌ 获取失败:', error.message);
    return false;
  }
}

async function runTests() {
  log(colors.cyan, '\n========================================');
  log(colors.cyan, '   开播监听器 API 测试');
  log(colors.cyan, '========================================\n');
  
  const results = [];
  
  // 执行测试
  results.push(await testStartMonitor());
  results.push(await testGetStatus());
  results.push(await testAddRoom());
  results.push(await testGetRooms());
  
  // 等待一段时间让监听器工作
  log(colors.yellow, '\n⏳ 等待60秒，观察监听器是否自动检测开播...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // 再次检查状态
  results.push(await testGetStatus());
  
  // 停止监听器
  results.push(await testStopMonitor());
  
  // 统计结果
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(colors.cyan, '\n========================================');
  log(colors.cyan, `   测试结果: ${passed}/${total} 通过`);
  log(colors.cyan, '========================================\n');
  
  if (passed === total) {
    log(colors.green, '🎉 所有测试通过！');
  } else {
    log(colors.red, '❌ 部分测试失败，请检查日志');
  }
}

// 运行测试
runTests().catch(error => {
  log(colors.red, '❌ 测试执行出错:', error.message);
  console.error(error);
  process.exit(1);
});
