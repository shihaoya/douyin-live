<template>
  <div class="message-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>💬 消息管理</span>
          <el-button type="primary" @click="loadMessages">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-form :inline="true" class="filter-form">
        <el-form-item label="直播间">
          <el-select v-model="selectedRoomId" placeholder="选择直播间" clearable style="width: 250px">
            <el-option
              v-for="room in rooms"
              :key="room.roomId"
              :label="getRoomLabel(room)"
              :value="room.roomId"
            >
              <span>{{ getRoomLabel(room) }}</span>
              <el-tag v-if="room.isDeleted" size="small" type="info" style="margin-left: 8px">已删除</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="消息类型">
          <el-select v-model="filterType" placeholder="全部" clearable style="width: 150px">
            <el-option
              v-for="type in messageTypes"
              :key="type.socket_type"
              :label="type.display_name || type.socket_type"
              :value="type.socket_type"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="用户昵称">
          <el-input v-model="filterUserNickname" placeholder="输入昵称" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="礼物名称">
          <el-input v-model="filterGiftName" placeholder="输入礼物名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 消息表格 -->
      <el-table
        :data="messages"
        height="calc(100vh - 380px)"
        stripe
        border
        v-loading="loading"
      >
        <el-table-column prop="received_at" label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.received_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="socket_type" label="类型" width="120">
          <template #default="{ row }">
            {{ getMessageTypeName(row.socket_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="user_nickname" label="用户" width="120" />
        <el-table-column prop="user_level" label="等级" width="70" />
        <el-table-column prop="fans_level" label="粉丝团" width="80" />
        <el-table-column prop="gift_name" label="礼物" width="120" />
        <el-table-column prop="gift_count" label="数量" width="70" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
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
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadMessages"
        @current-change="loadMessages"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <!-- 原始数据对话框 -->
    <el-dialog v-model="dialogVisible" title="原始消息数据" width="70%">
      <pre class="json-viewer">{{ formattedRawData }}</pre>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyToClipboard">
          <el-icon><CopyDocument /></el-icon>
          复制JSON
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, View, CopyDocument } from '@element-plus/icons-vue'
import { getRooms, getAllRooms, getMessages, getMessageRawData } from '@/api/room'
import { getProcessors } from '@/api/processor'

const rooms = ref([])
const selectedRoomId = ref('')
const messages = ref([])
const messageTypes = ref([]) // 消息类型列表
const currentPage = ref(1)
const pageSize = ref(50)
const total = ref(0)
const filterType = ref('')
const filterUserNickname = ref('')
const filterGiftName = ref('')
const dateRange = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const rawData = ref('')

// 格式化JSON显示
const formattedRawData = computed(() => {
  if (!rawData.value) return ''
  
  try {
    const obj = typeof rawData.value === 'string' ? JSON.parse(rawData.value) : rawData.value
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return rawData.value
  }
})

// 加载消息类型
const loadMessageTypes = async () => {
  try {
    const res = await getProcessors()
    messageTypes.value = res.data?.processors || []
  } catch (error) {
    console.error('加载消息类型失败', error)
  }
}

// 加载直播间列表（包括已删除的，用于下拉菜单）
const loadRooms = async () => {
  try {
    const res = await getAllRooms()
    rooms.value = res.data.rooms || []
  } catch (error) {
    console.error('加载直播间失败', error)
  }
}

// 获取直播间显示标签
const getRoomLabel = (room) => {
  const baseLabel = room.roomName ? `${room.roomName} (${room.roomId})` : room.roomId
  return baseLabel
}

// 加载消息
const loadMessages = async () => {
  if (!selectedRoomId.value) {
    ElMessage.warning('请先选择直播间')
    return
  }

  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      messageType: filterType.value,
      userNickname: filterUserNickname.value,
      giftName: filterGiftName.value
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0].toISOString()
      params.endTime = dateRange.value[1].toISOString()
    }

    const res = await getMessages(selectedRoomId.value, params)
    messages.value = res.data.messages || []
    total.value = Number(res.data.total) || 0
  } catch (error) {
    ElMessage.error('加载消息失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadMessages()
}

// 重置
const handleReset = () => {
  filterType.value = ''
  filterUserNickname.value = ''
  filterGiftName.value = ''
  dateRange.value = []
  currentPage.value = 1
  loadMessages()
}

// 显示原始数据
const showRawData = async (row) => {
  try {
    loading.value = true
    const res = await getMessageRawData(row.message_id)
    rawData.value = typeof res.data.rawData === 'string' ? res.data.rawData : JSON.stringify(res.data.rawData, null, 2)
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取原始数据失败')
  } finally {
    loading.value = false
  }
}

// 复制到剪贴板
const copyToClipboard = () => {
  navigator.clipboard.writeText(rawData.value).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 获取消息类型名称
const getMessageTypeName = (type) => {
  const typeConfig = messageTypes.value.find(t => t.socket_type === type)
  return typeConfig?.display_name || type
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadMessageTypes()
  loadRooms()
})
</script>

<style scoped>
.message-list {
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

.json-viewer {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  max-height: 60vh;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
