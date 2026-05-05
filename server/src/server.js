const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { testConnection, pool } = require('./config/database');
const WebSocketServer = require('./websocket/WebSocketServer');
const LiveMonitor = require('./utils/LiveMonitor');

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 1. 测试数据库连接
    logger.info('正在测试数据库连接...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('数据库连接失败，请检查配置');
      process.exit(1);
    }
    
    // 2. 创建HTTP服务器
    const server = http.createServer(app);
    
    // 3. 启动WebSocket服务器
    const wsServer = new WebSocketServer(server, {
      maxReconnectAttempts: 10,
      reconnectInterval: 5000,
      cookie: config.douyin.cookie  // 传递配置文件中的cookie
    });
    
    // 设置单例
    WebSocketServer.setInstance(wsServer);
    
    wsServer.start();
    
    // 4. 恢复直播间（从数据库加载）
    try {
      const [rooms] = await pool.execute(
        'SELECT room_id FROM room_configs WHERE is_active = TRUE AND auto_start = TRUE'
      );
      
      if (rooms.length > 0) {
        logger.info(`发现 ${rooms.length} 个需要恢复的直播间`);
        for (const room of rooms) {
          try {
            await wsServer.startRoom(room.room_id);
            logger.info(`✅ 已恢复直播间: ${room.room_id}`);
          } catch (error) {
            logger.error('❌ 恢复直播间 %s 失败: %s', room.room_id, error.message);
          }
        }
      } else {
        logger.info('没有需要恢复的直播间');
      }
    } catch (error) {
      logger.error('恢复直播间失败:', error.message);
    }
    
    // 5. 启动开播监听器
    try {
      const monitor = new LiveMonitor({
        checkInterval: config.monitor.checkInterval,
        restartCooldown: config.monitor.restartCooldown
      });
      LiveMonitor.setInstance(monitor);
      monitor.start();
      logger.info(`🔍 开播监听器已自动启动（检查间隔: ${config.monitor.checkInterval / 1000}秒，重启冷却: ${config.monitor.restartCooldown / 1000}秒）`);
    } catch (error) {
      logger.error('启动开播监听器失败:', error.message);
    }
    
    // 6. 启动监听
    server.listen(config.port, () => {
      logger.info('========================================');
      logger.info(`服务器已启动！`);
      logger.info(`访问地址: http://localhost:${config.port}`);
      logger.info(`健康检查: http://localhost:${config.port}/health`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info('========================================');
    });
    
    // 7. 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到SIGTERM信号，准备关闭服务器...');
      wsServer.close();
      
      // 停止开播监听器
      const monitor = LiveMonitor.getInstance();
      if (monitor) {
        monitor.stop();
      }
      
      server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，准备关闭服务器...');
      wsServer.close();
      
      // 停止开播监听器
      const monitor = LiveMonitor.getInstance();
      if (monitor) {
        monitor.stop();
      }
      
      server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
