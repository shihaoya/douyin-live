import request from '../utils/request';

/**
 * 同步礼物数据
 */
export function syncGifts() {
  return request({
    url: '/gifts/sync',
    method: 'post'
  });
}

/**
 * 获取礼物列表
 */
export function getGifts(params) {
  return request({
    url: '/gifts',
    method: 'get',
    params
  });
}

/**
 * 删除礼物
 */
export function deleteGift(id) {
  return request({
    url: `/gifts/${id}`,
    method: 'delete'
  });
}
