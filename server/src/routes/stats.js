const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');

// 获取直播间列表
router.get('/rooms', StatsController.getRoomList);

// 获取直播间统计数据
router.get('/:roomId', StatsController.getRoomStats);

// 获取用户礼物详情
router.get('/details/gifts', StatsController.getUserGiftDetails);

// 获取评论详情
router.get('/details/comments', StatsController.getCommentDetails);

// 获取礼物类型详情（谁送了这个礼物）
router.get('/details/gift-type', StatsController.getGiftTypeDetails);

// 获取点赞详情
router.get('/details/likes', StatsController.getLikeDetails);

module.exports = router;
