const mysql = require('mysql2/promise');
const config = require('./index');

// 创建数据库连接池
const pool = mysql.createPool(config.database);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
