/**
 * 统一响应格式工具类
 */
class Response {
  /**
   * 成功响应
   */
  static success(data = null, message = 'success') {
    return {
      code: 200,
      message,
      data
    };
  }

  /**
   * 失败响应
   */
  static error(message = 'error', code = 500, data = null) {
    return {
      code,
      message,
      data
    };
  }

  /**
   * 分页响应
   */
  static page(list = [], total = 0, page = 1, pageSize = 10) {
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    };
  }
}

module.exports = Response;
