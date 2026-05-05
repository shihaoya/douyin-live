<template>
  <div class="room-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>📺 直播间监控管理</span>
          <div style="display: flex; gap: 10px;">
            <el-button type="success" @click="showRefreshOpenidDialog">
              <el-icon><Refresh /></el-icon>
              刷新QQ OpenID
            </el-button>
            <el-button type="primary" @click="loadRooms">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 添加直播间 -->
      <el-form :inline="true" @submit.prevent="handleAddRoom">
        <el-form-item label="直播间ID">
          <el-input
            v-model="newRoomId"
            placeholder="输入直播间ID"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="直播间名称">
          <el-input
            v-model="newRoomName"
            placeholder="输入直播间名称（可选）"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleAddRoom">
            <el-icon><Plus /></el-icon>
            添加监控
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 直播间列表 -->
      <el-table :data="rooms" stripe border style="margin-top: 20px">
        <el-table-column prop="roomId" label="直播间ID" width="150" />
        <el-table-column prop="roomName" label="直播间名称" width="200" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="messageCount" label="消息数量" width="120" />
        <el-table-column label="连接时间" width="180">
          <template #default="{ row }">
            {{ row.connectedAt ? formatTime(row.connectedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="最后消息" width="180">
          <template #default="{ row }">
            {{ row.lastMessageAt ? formatTime(row.lastMessageAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="280">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="handleShowDetail(row.roomId)"
            >
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button
              v-if="row.status === 'disconnected'"
              size="small"
              type="success"
              @click="handleResumeRoom(row.roomId)"
            >
              <el-icon><VideoPlay /></el-icon>
              继续监控
            </el-button>
            <el-button
              v-else
              size="small"
              type="warning"
              @click="handlePauseRoom(row.roomId)"
            >
              <el-icon><VideoPause /></el-icon>
              暂停监控
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleRemoveRoom(row.roomId)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="rooms.length === 0" description="暂无监听的直播间" style="margin-top: 40px" />
    </el-card>

    <!-- 消息详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`直播间 ${currentRoomId} - 消息详情`"
      width="80%"
      :close-on-click-modal="false"
    >
      <div v-loading="detailLoading">
        <!-- 筛选条件 -->
        <el-form :inline="true" class="filter-form">
          <el-form-item label="消息类型">
            <el-select v-model="detailFilterType" placeholder="全部" clearable style="width: 150px">
              <el-option
                v-for="type in messageTypes"
                :key="type.socket_type"
                :label="type.display_name || type.socket_type"
                :value="type.socket_type"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadRoomMessages">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 消息表格 -->
        <el-table
          :data="roomMessages"
          height="500"
          stripe
          border
        >
          <el-table-column prop="created_at" label="时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="message_type" label="类型" width="120">
            <template #default="{ row }">
              {{ getMessageTypeName(row.message_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="method" label="Method" width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text @click="showRawData(row)">
                <el-icon><View /></el-icon>
                原始数据
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <el-pagination
          v-model:current-page="detailCurrentPage"
          v-model:page-size="detailPageSize"
          :total="detailTotal"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRoomMessages"
          @current-change="loadRoomMessages"
          style="margin-top: 20px; justify-content: flex-end"
        />
      </div>
    </el-dialog>

    <!-- 原始数据对话框 -->
    <el-dialog
      v-model="rawDataDialogVisible"
      title="原始数据"
      width="70%"
    >
      <div v-if="currentRawData" style="max-height: 500px; overflow: auto; background: #f5f7fa; padding: 15px; border-radius: 4px;">
        <pre>{{ typeof currentRawData === 'string' ? currentRawData : JSON.stringify(currentRawData, null, 2) }}</pre>
      </div>
      <el-empty v-else description="暂无数据" />
    </el-dialog>

    <!-- 刷新QQ OpenID对话框 -->
    <el-dialog
      v-model="refreshOpenidDialogVisible"
      title="刷新QQ OpenID"
      width="500px"
    >
      <el-alert
        title="使用说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p>1. 在QQ中给机器人发送任意消息</p>
        <p>2. 从服务器日志中复制获取到的OpenID</p>
        <p>3. 粘贴到下方输入框，点击确定</p>
        <p>4. 系统会发送测试消息验证配置</p>
      </el-alert>

      <el-form label-width="80px">
        <el-form-item label="OpenID">
          <el-input
            v-model="newOpenid"
            placeholder="请输入OpenID，例如: 814260AB3F2B7450C4320FD86041B9A4"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="refreshOpenidDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRefreshOpenid">
          确定并发送测试消息
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, VideoPlay, VideoPause, Delete, View, Search } from '@element-plus/icons-vue'
import { getRooms, startRoom, pauseRoom, stopRoom, getRoomMessages, getMessageRawData } from '@/api/room'
import { getMessageTypes } from '@/api/processor'
import { qqbotAPI } from '@/api/qqbot'

const newRoomId = ref('')
const newRoomName = ref('')
const rooms = ref([])
const messageTypes = ref([])

// 详情对话框相关
const detailDialogVisible = ref(false)
const rawDataDialogVisible = ref(false)
const currentRoomId = ref('')
const roomMessages = ref([])
const detailLoading = ref(false)
const detailCurrentPage = ref(1)
const detailPageSize = ref(50)
const detailTotal = ref(0)
const detailFilterType = ref('')
const currentRawData = ref(null)

// QQ OpenID刷新相关
const refreshOpenidDialogVisible = ref(false)
const newOpenid = ref('')

// 加载直播间列表
const loadRooms = async () => {
  try {
    const res = await getRooms()
    // 后端已经过滤掉已删除的，直接使用
    rooms.value = res.data.rooms || []
  } catch (error) {
    ElMessage.error('加载直播间列表失败')
  }
}

// 添加直播间
const handleAddRoom = async () => {
  if (!newRoomId.value) {
    ElMessage.warning('请输入直播间ID')
    return
  }

  try {
    await startRoom(newRoomId.value, newRoomName.value)
    ElMessage.success('开始监控成功')
    newRoomId.value = ''
    newRoomName.value = ''
    // 等待500ms让WebSocket连接建立
    await new Promise(resolve => setTimeout(resolve, 500))
    await loadRooms()
  } catch (error) {
    ElMessage.error('开始监控失败: ' + error.message)
  }
}

// 暂停监控（停止但保留记录）
const handlePauseRoom = async (roomId) => {
  try {
    await ElMessageBox.confirm('确定要暂停监控该直播间吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await pauseRoom(roomId)
    ElMessage.success('已暂停监控')
    await loadRooms()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('暂停监控失败')
    }
  }
}

// 继续监控
const handleResumeRoom = async (roomId) => {
  try {
    await startRoom(roomId)
    ElMessage.success('继续监控成功')
    // 等待500ms让WebSocket连接建立
    await new Promise(resolve => setTimeout(resolve, 500))
    await loadRooms()
  } catch (error) {
    ElMessage.error('继续监控失败: ' + error.message)
  }
}

// 删除直播间（逻辑删除）
const handleRemoveRoom = async (roomId) => {
  try {
    await ElMessageBox.confirm('确定要删除该直播间吗？删除后历史消息仍然可以查看。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await stopRoom(roomId)
    ElMessage.success('已删除直播间')
    await loadRooms()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 获取状态类型
const getStatusType = (status) => {
  return status === 'connected' ? 'success' : 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  return status === 'connected' ? '监控中' : '已暂停'
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

// 获取消息类型名称
const getMessageTypeName = (type) => {
  const found = messageTypes.value.find(t => t.socket_type === type)
  return found ? (found.display_name || type) : type
}

// 显示详情对话框
const handleShowDetail = async (roomId) => {
  currentRoomId.value = roomId
  detailDialogVisible.value = true
  detailCurrentPage.value = 1
  detailFilterType.value = ''
  await loadMessageTypes()
  await loadRoomMessages()
}

// 加载消息类型列表
const loadMessageTypes = async () => {
  try {
    const res = await getMessageTypes()
    messageTypes.value = res.data.types || []
  } catch (error) {
    console.error('加载消息类型失败:', error)
  }
}

// 加载直播间消息
const loadRoomMessages = async () => {
  if (!currentRoomId.value) return
  
  detailLoading.value = true
  try {
    const params = {
      limit: detailPageSize.value,
      offset: (detailCurrentPage.value - 1) * detailPageSize.value
    }
    
    if (detailFilterType.value) {
      params.type = detailFilterType.value
    }
    
    const res = await getRoomMessages(currentRoomId.value, params)
    roomMessages.value = res.data.messages || []
    detailTotal.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('加载消息失败')
    console.error(error)
  } finally {
    detailLoading.value = false
  }
}

// 显示原始数据
const showRawData = async (message) => {
  try {
    console.log('获取原始数据, message.id:', message.id)
    const res = await getMessageRawData(message.id)
    console.log('API响应:', res)
    
    // 兼容两种字段名
    const rawData = res.data.rawData || res.data.raw_data
    console.log('原始数据:', rawData)
    
    if (!rawData) {
      ElMessage.warning('未找到原始数据')
      return
    }
    
    currentRawData.value = rawData
    rawDataDialogVisible.value = true
  } catch (error) {
    console.error('获取原始数据失败:', error)
    ElMessage.error('获取原始数据失败: ' + (error.response?.data?.message || error.message))
  }
}

// 显示刷新OpenID对话框
const showRefreshOpenidDialog = () => {
  newOpenid.value = ''
  refreshOpenidDialogVisible.value = true
}

// 刷新OpenID
const handleRefreshOpenid = async () => {
  if (!newOpenid.value) {
    ElMessage.warning('请输入OpenID')
    return
  }

  try {
    ElMessage.info('正在发送测试消息...')
    const res = await qqbotAPI.refreshOpenid(newOpenid.value)
    
    if (res.data.code === 200) {
      ElMessage.success(res.data.message)
      refreshOpenidDialogVisible.value = false
    } else {
      ElMessage.error(res.data.message || '刷新失败')
    }
  } catch (error) {
    console.error('刷新OpenID失败:', error)
    ElMessage.error(error.response?.data?.message || '刷新OpenID失败')
  }
}

onMounted(() => {
  loadRooms()
  // 每10秒自动刷新一次
  setInterval(loadRooms, 10000)
})
</script>

<style scoped>
.room-manager {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.filter-form {
  margin-bottom: 20px;
}
</style>
