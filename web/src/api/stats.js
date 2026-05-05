import request from '../utils/request';

/**
 * 获取直播间列表
 */
export function getRoomList() {
  return request({
    url: '/stats/rooms',
    method: 'get'
  });
}

/**
 * 获取直播间统计数据
 */
export function getRoomStats(roomId, params) {
  return request({
    url: `/stats/${roomId}`,
    method: 'get',
    params
  });
}

/**
 * 获取用户礼物详情
 */
export function getUserGiftDetails(params) {
  return request({
    url: '/stats/details/gifts',
    method: 'get',
    params
  });
}

/**
 * 获取评论详情
 */
export function getCommentDetails(params) {
  return request({
    url: '/stats/details/comments',
    method: 'get',
    params
  });
}

/**
 * 获取礼物类型详情（谁送了这个礼物）
 */
export function getGiftTypeDetails(params) {
  return request({
    url: '/stats/details/gift-type',
    method: 'get',
    params
  });
}

/**
 * 获取点赞详情
 */
export function getLikeDetails(params) {
  return request({
    url: '/stats/details/likes',
    method: 'get',
    params
  });
}
