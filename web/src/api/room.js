import request from '@/utils/request'

/**
 * 获取所有监听的直播间（不包括已删除的）
 */
export function getRooms() {
  return request({
    url: '/rooms',
    method: 'get'
  })
}

/**
 * 获取所有直播间（包括已删除的，用于下拉菜单）
 */
export function getAllRooms() {
  return request({
    url: '/rooms/all',
    method: 'get'
  })
}

/**
 * 开始监听直播间
 */
export function startRoom(roomId, roomName = '') {
  return request({
    url: `/rooms/${roomId}/start`,
    method: 'post',
    data: { roomName }
  })
}

/**
 * 停止监听直播间（逻辑删除）
 */
export function stopRoom(roomId) {
  return request({
    url: `/rooms/${roomId}/config`,
    method: 'delete'
  })
}

/**
 * 暂停监控直播间（仅停止监听，保留配置）
 */
export function pauseRoom(roomId) {
  return request({
    url: `/rooms/${roomId}`,
    method: 'delete'
  })
}

/**
 * 获取直播间状态
 */
export function getRoomStatus(roomId) {
  return request({
    url: `/rooms/${roomId}/status`,
    method: 'get'
  })
}

/**
 * 获取直播间消息列表（查询 messages 表 - 用于消息管理页面）
 */
export function getMessages(roomId, params = {}) {
  return request({
    url: `/messages/${roomId}`,
    method: 'get',
    params
  })
}

/**
 * 获取直播间原始消息列表（查询 live_messages 表 - 用于直播间详情）
 */
export function getRoomMessages(roomId, params = {}) {
  return request({
    url: `/rooms/${roomId}/messages`,
    method: 'get',
    params
  })
}

/**
 * 获取消息类型统计
 */
export function getMessageStats(roomId) {
  return request({
    url: `/rooms/${roomId}/stats`,
    method: 'get'
  })
}

/**
 * 获取单条消息的原始数据
 */
export function getMessageRawData(messageId) {
  return request({
    url: `/rooms/messages/${messageId}/raw`,
    method: 'get'
  })
}
