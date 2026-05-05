const express = require('express');
const router = express.Router();
const GiftController = require('../controllers/GiftController');

// 同步礼物数据
router.post('/sync', GiftController.syncGifts);

// 获取礼物列表
router.get('/', GiftController.getGifts);

// 删除礼物
router.delete('/:id', GiftController.deleteGift);

module.exports = router;
