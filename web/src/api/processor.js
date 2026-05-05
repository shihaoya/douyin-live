import request from '@/utils/request'

/**
 * 获取所有处理器配置
 */
export function getProcessors() {
  return request({
    url: '/processors',
    method: 'get'
  })
}

/**
 * 获取所有 Socket 类型
 */
export function getSocketTypes() {
  return request({
    url: '/processors/socket-types',
    method: 'get'
  })
}

/**
 * 获取消息类型列表（别名）
 */
export function getMessageTypes() {
  return getSocketTypes()
}

/**
 * 添加处理器配置
 */
export function addProcessor(data) {
  return request({
    url: '/processors',
    method: 'post',
    data
  })
}

/**
 * 更新处理器配置
 */
export function updateProcessor(id, data) {
  return request({
    url: `/processors/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除处理器配置
 */
export function deleteProcessor(id) {
  return request({
    url: `/processors/${id}`,
    method: 'delete'
  })
}

/**
 * 测试解析模板
 */
export function testTemplate(data) {
  return request({
    url: '/processors/test',
    method: 'post',
    data
  })
}
