require('dotenv').config();

const config = {
  // 服务器配置
  port: process.env.PORT || 3000,
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'douyin_live',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 100,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true
  },
  
  // 抖音配置
  douyin: {
    cookie: process.env.DOUYIN_COOKIE || ''
  },
  
  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'debug',  // 临时改为debug查看详细日志
    dir: process.env.LOG_DIR || 'logs'
  },
  
  // 开播监听配置
  monitor: {
    checkInterval: parseInt(process.env.MONITOR_CHECK_INTERVAL) || 60000, // 检查间隔（毫秒），默认60秒
    restartCooldown: parseInt(process.env.MONITOR_RESTART_COOLDOWN) || 300000 // 重启冷却时间（毫秒），默认5分钟
  }
};

module.exports = config;
