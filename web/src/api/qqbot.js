import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * QQ机器人API
 */
export const qqbotAPI = {
  /**
   * 刷新OpenID
   */
  refreshOpenid(openid) {
    return axios.post(`${API_BASE}/qqbot/refresh-openid`, { openid });
  },

  /**
   * 获取当前OpenID配置
   */
  getConfig() {
    return axios.get(`${API_BASE}/qqbot/config`);
  },

  /**
   * 测试发送消息
   */
  testMessage(content) {
    return axios.post(`${API_BASE}/qqbot/test-message`, { content });
  }
};
