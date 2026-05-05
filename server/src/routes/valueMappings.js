const express = require('express');
const router = express.Router();
const ValueMappingController = require('../controllers/ValueMappingController');

/**
 * 值映射管理API
 */

// 获取所有映射配置
router.get('/', ValueMappingController.getAllMappings);

// 获取单个映射详情
router.get('/:id', ValueMappingController.getMappingDetail);

// 创建映射配置
router.post('/', ValueMappingController.createMapping);

// 更新映射配置
router.put('/:id', ValueMappingController.updateMapping);

// 删除映射配置
router.delete('/:id', ValueMappingController.deleteMapping);

module.exports = router;
