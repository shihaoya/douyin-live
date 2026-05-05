import request from '@/utils/request'

/**
 * 获取所有映射配置列表
 */
export function getMappings() {
  return request({
    url: '/value-mappings',
    method: 'get'
  })
}

/**
 * 获取单个映射详情
 */
export function getMappingDetail(id) {
  return request({
    url: `/value-mappings/${id}`,
    method: 'get'
  })
}

/**
 * 创建映射配置
 */
export function createMapping(data) {
  return request({
    url: '/value-mappings',
    method: 'post',
    data
  })
}

/**
 * 更新映射配置
 */
export function updateMapping(id, data) {
  return request({
    url: `/value-mappings/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除映射配置
 */
export function deleteMapping(id) {
  return request({
    url: `/value-mappings/${id}`,
    method: 'delete'
  })
}
