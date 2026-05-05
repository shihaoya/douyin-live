# MySQL 字符集配置说明

## 问题原因
MySQL客户端默认使用`utf8`连接，导致中文显示为问号。

## 解决方案

### 方案1：修改MySQL配置文件（推荐，永久生效）

找到MySQL配置文件 `my.ini` 或 `my.cnf`，通常在：
- Windows: `D:\phpstudy_pro\Extensions\MySQL8.0.12\my.ini`
- Linux: `/etc/mysql/my.cnf` 或 `/etc/my.cnf`

在 `[mysqld]` 部分添加：
```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

在 `[client]` 部分添加：
```ini
[client]
default-character-set = utf8mb4
```

在 `[mysql]` 部分添加：
```ini
[mysql]
default-character-set = utf8mb4
```

然后**重启MySQL服务**。

### 方案2：每次连接时指定字符集（临时方案）

命令行连接时：
```bash
mysql -u root -p --default-character-set=utf8mb4 douyin_live
```

Node.js中已配置（无需修改）：
```javascript
database: {
  charset: 'utf8mb4',
  // ...其他配置
}
```

### 方案3：修复已有乱码数据

如果之前的数据已经变成问号，需要重新采集数据，因为问号是不可逆的损坏。

## 验证配置

重启MySQL后，执行以下命令验证：
```sql
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
```

应该看到：
- character_set_client = utf8mb4
- character_set_connection = utf8mb4
- character_set_results = utf8mb4
- character_set_server = utf8mb4
- collation_connection = utf8mb4_unicode_ci
- collation_server = utf8mb4_unicode_ci

## 当前状态

✅ Node.js连接已配置utf8mb4  
✅ 数据库和表已设置为utf8mb4  
⚠️ MySQL服务器全局配置仍为utf8（需要修改my.ini并重启）  
⚠️ 已有乱码数据无法恢复，需要重新采集
