const winston = require('winston');
const path = require('path');
const config = require('./index');

// 确保日志目录存在
const fs = require('fs');
if (!fs.existsSync(config.log.dir)) {
  fs.mkdirSync(config.log.dir, { recursive: true });
}

// 创建logger实例
const logger = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'douyin-live-server' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: path.join(config.log.dir, 'error.log'),
      level: 'error'
    }),
    // 所有日志
    new winston.transports.File({
      filename: path.join(config.log.dir, 'combined.log')
    })
  ]
});

// 开发环境下同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
