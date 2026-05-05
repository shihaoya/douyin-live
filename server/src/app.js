const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./config/logger');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const processorRoutes = require('./routes/processors');
const valueMappingRoutes = require('./routes/valueMappings');
const giftRoutes = require('./routes/gifts');
const statsRoutes = require('./routes/stats');
const qqbotRoutes = require('./routes/qqbot');

const app = express();

// ==================== 中间件 ====================

// CORS
app.use(cors());

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ==================== 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'douyin-live-server'
  });
});

// API路由占位
app.get('/api', (req, res) => {
  res.json({
    message: '抖音直播监控系统API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      messages: '/api/messages',
      gifts: '/api/gifts',
      stats: '/api/stats'
    }
  });
});

// 注册直播间管理路由
app.use('/api/rooms', roomRoutes);

// 注册消息管理路由
app.use('/api/messages', messageRoutes);

// 注册消息处理器管理路由
app.use('/api/processors', processorRoutes);

// 注册值映射管理路由
app.use('/api/value-mappings', valueMappingRoutes);

// 注册礼物管理路由
app.use('/api/gifts', giftRoutes);

// 注册统计路由
app.use('/api/stats', statsRoutes);

// 注册QQ机器人路由
app.use('/api/qqbot', qqbotRoutes);

// ==================== 错误处理 ====================

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err);
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

module.exports = app;
