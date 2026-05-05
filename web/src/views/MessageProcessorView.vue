<template>
  <div class="message-processor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>⚙️ 消息处理管理</span>
          <div>
            <el-button type="success" @click="showReprocessDialog">
              <el-icon><Refresh /></el-icon>
              处理历史数据
            </el-button>
            <el-button type="primary" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              添加处理器
            </el-button>
          </div>
        </div>
      </template>

      <!-- 处理器列表 -->
      <el-table :data="processors" stripe border>
        <el-table-column prop="socket_type" label="Socket类型" width="250" />
        <el-table-column prop="message_type" label="消息类型" width="150" />
        <el-table-column prop="display_name" label="显示名称" width="150" />
        <el-table-column label="解析模板" min-width="300">
          <template #default="{ row }">
            <el-tag v-if="row.description_template" type="info" size="small">
              {{ row.description_template }}
            </el-tag>
            <span v-else style="color: #909399">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_enabled ? 'success' : 'danger'" size="small">
              {{ row.is_enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="400" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text @click="showTestDialog(row)">
              <el-icon><VideoPlay /></el-icon>
              测试
            </el-button>
            <el-button size="small" text @click="showEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row.id)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="processors.length === 0" description="暂无处理器配置" style="margin-top: 40px" />
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑处理器' : '添加处理器'" width="600px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="Socket类型" required>
          <el-select
            v-model="form.socket_type"
            placeholder="选择或输入 Socket 类型"
            filterable
            allow-create
            default-first-option
            @change="handleSocketTypeChange"
            style="width: 100%"
          >
            <el-option
              v-for="type in socketTypes"
              :key="type"
              :label="type"
              :value="type"
              :disabled="!isEdit && usedSocketTypes.includes(type)"
            />
          </el-select>
          <div class="form-tip">可从列表选择，也可直接输入新的 Socket 类型</div>
          <div v-if="!isEdit" class="form-tip" style="color: #f56c6c; margin-top: 4px;">
            已配置的 Socket 类型无法重复选择
          </div>
        </el-form-item>
        <el-form-item label="消息类型" required>
          <el-input v-model="form.message_type" placeholder="如: 弹幕" />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="form.display_name" placeholder="如: 弹幕" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
        <el-form-item label="解析模板">
          <el-input
            v-model="form.description_template"
            type="textarea"
            :rows="3"
            placeholder="如: {action == 1 ? '进入' : '退出'} 或 {action:map_action}"
          />
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div class="form-tip">
              方式1: {条件 ? 真值 : 假值} | 方式2: {字段:映射键}
            </div>
            <el-button 
              size="small"
              type="primary" 
              plain
              @click="showSampleDialog"
              :disabled="!form.socket_type"
            >
              获取示例
            </el-button>
          </div>
          <div class="form-tip" style="margin-top: 4px;">
            使用 {字段:映射键} 时，系统会自动从映射配置中查找对应的映射关系
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 测试对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试解析模板" width="700px">
      <el-form label-width="100px">
        <el-form-item label="解析模板">
          <el-input v-model="testForm.template" placeholder="{action == 1 ? '进入' : '退出'}" />
          <div class="form-tip">支持 {字段} 和 {条件 ? 真值 : 假值}</div>
        </el-form-item>
        <el-form-item label="示例数据">
          <el-input
            v-model="testForm.sample_data"
            type="textarea"
            :rows="8"
            placeholder='{"user": {"nickName": "张三"}, "count": 10}'
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleTest">测试解析</el-button>
        </el-form-item>
        <el-form-item label="解析结果" v-if="testResult !== null">
          <el-alert
            :title="testResult !== null ? String(testResult) : '解析失败'"
            :type="testResult !== null ? 'success' : 'error'"
            :closable="false"
          />
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 处理历史数据对话框 -->
    <el-dialog v-model="reprocessDialogVisible" title="处理历史数据" width="600px">
      <el-form :model="reprocessForm" label-width="120px">
        <el-form-item label="直播间" required>
          <el-select
            v-model="reprocessForm.room_id"
            placeholder="选择直播间"
            filterable
            style="width: 100%"
          >
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
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="reprocessForm.start_time"
            type="datetime"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="reprocessForm.end_time"
            type="datetime"
            placeholder="选择结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="处理数量">
          <el-input-number v-model="reprocessForm.limit" :min="100" :max="10000" :step="100" />
          <div class="form-tip">每次最多处理10000条消息</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleReprocess" :loading="reprocessing">
            开始处理
          </el-button>
        </el-form-item>
        <el-form-item label="处理结果" v-if="reprocessResult">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="总数">{{ reprocessResult.total }}</el-descriptions-item>
            <el-descriptions-item label="成功">{{ reprocessResult.processed }}</el-descriptions-item>
            <el-descriptions-item label="跳过">{{ reprocessResult.skipped }}</el-descriptions-item>
            <el-descriptions-item label="失败">{{ reprocessResult.errors }}</el-descriptions-item>
          </el-descriptions>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 示例数据对话框 -->
    <el-dialog v-model="sampleDialogVisible" title="原始消息示例" width="800px">
      <div v-if="sampleDataList.length > 0">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span>共找到 {{ sampleDataList.length }} 条示例数据</span>
          <div>
            <el-button size="small" @click="prevSample" :disabled="currentSampleIndex === 0">
              <el-icon><ArrowLeft /></el-icon>
              上一条
            </el-button>
            <el-button size="small" @click="nextSample" :disabled="currentSampleIndex === sampleDataList.length - 1">
              下一条
              <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-tag type="info" style="margin-left: 12px">
              {{ currentSampleIndex + 1 }} / {{ sampleDataList.length }}
            </el-tag>
          </div>
        </div>
        <pre class="json-viewer">{{ formattedSampleData }}</pre>
      </div>
      <el-empty v-else description="未找到示例数据" />
      <template #footer>
        <el-button @click="sampleDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copySampleData">
          <el-icon><CopyDocument /></el-icon>
          复制JSON
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, VideoPlay, Edit, Delete, Refresh, ArrowLeft, ArrowRight, CopyDocument } from '@element-plus/icons-vue'
import { getProcessors, getSocketTypes, addProcessor, updateProcessor, deleteProcessor, testTemplate } from '@/api/processor'
import { getRooms, getAllRooms } from '@/api/room'
import axios from 'axios'

const processors = ref([])
const socketTypes = ref([])
const rooms = ref([])
const dialogVisible = ref(false)
const testDialogVisible = ref(false)
const reprocessDialogVisible = ref(false)
const sampleDialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const testResult = ref(null)
const reprocessing = ref(false)
const reprocessResult = ref(null)

// 示例数据相关
const sampleDataList = ref([])
const currentSampleIndex = ref(0)

// 已使用的 Socket 类型列表（用于禁用选项）
const usedSocketTypes = computed(() => {
  // 编辑时，排除当前编辑的项
  if (isEdit.value && currentId.value) {
    const currentProcessor = processors.value.find(p => p.id === currentId.value)
    if (currentProcessor) {
      return processors.value
        .filter(p => p.id !== currentId.value)
        .map(p => p.socket_type)
    }
  }
  return processors.value.map(p => p.socket_type)
})

const form = ref({
  socket_type: '',
  message_type: '',
  display_name: '',
  color: '#909399',
  description_template: ''
})

const testForm = ref({
  template: '',
  sample_data: ''
})

const reprocessForm = ref({
  room_id: '',
  start_time: null,
  end_time: null,
  limit: 1000
})

// 加载处理器列表
const loadProcessors = async () => {
  try {
    const res = await getProcessors()
    processors.value = res.data.processors || []
  } catch (error) {
    ElMessage.error('加载失败')
  }
}

// 加载 Socket 类型列表
const loadSocketTypes = async () => {
  try {
    const res = await getSocketTypes()
    socketTypes.value = res.data.socketTypes || []
  } catch (error) {
    console.error('加载 Socket 类型失败', error)
  }
}

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    socket_type: '',
    message_type: '',
    display_name: '',
    color: '#909399',
    description_template: ''
  }
  dialogVisible.value = true
}

// Socket 类型变化处理（支持手动输入）
const handleSocketTypeChange = (value) => {
  // 如果输入的值不在列表中，自动添加到列表
  if (value && !socketTypes.value.includes(value)) {
    socketTypes.value.push(value)
    socketTypes.value.sort()
  }
}

// 显示编辑对话框
const showEditDialog = (row) => {
  isEdit.value = true
  currentId.value = row.id
  form.value = { ...row }
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!form.value.socket_type || !form.value.message_type) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    if (isEdit.value) {
      await updateProcessor(currentId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await addProcessor(form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    await loadProcessors()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 删除
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该配置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteProcessor(id)
    ElMessage.success('删除成功')
    await loadProcessors()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 显示测试对话框
const showTestDialog = (row) => {
  testForm.value = {
    template: row.description_template || '',
    sample_data: JSON.stringify({ data: { content: { message: '测试消息' } } }, null, 2)
  }
  testResult.value = null
  testDialogVisible.value = true
}

// 测试解析
const handleTest = async () => {
  if (!testForm.value.template || !testForm.value.sample_data) {
    ElMessage.warning('请填写模板和示例数据')
    return
  }

  try {
    const res = await testTemplate(testForm.value)
    if (res.code === 200) {
      testResult.value = res.data.result
    } else {
      testResult.value = null
      ElMessage.error(res.message || '测试失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '测试失败')
    testResult.value = null
  }
}

// 显示处理历史数据对话框
const showReprocessDialog = () => {
  reprocessForm.value = {
    room_id: '',
    start_time: null,
    end_time: null,
    limit: 1000
  }
  reprocessResult.value = null
  reprocessDialogVisible.value = true
}

// 处理历史数据
const handleReprocess = async () => {
  if (!reprocessForm.value.room_id) {
    ElMessage.warning('请输入直播间ID')
    return
  }

  reprocessing.value = true
  reprocessResult.value = null

  try {
    const res = await axios.post('/api/processors/reprocess', reprocessForm.value)
    reprocessResult.value = res.data.data
    ElMessage.success(`处理完成！共${res.data.data.total}条，成功${res.data.data.processed}条`)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '处理失败')
  } finally {
    reprocessing.value = false
  }
}

// 加载直播间列表（包括已删除的，用于获取示例数据）
const loadRooms = async () => {
  try {
    const res = await getAllRooms()
    rooms.value = res.data.rooms || []
  } catch (error) {
    console.error('加载直播间列表失败:', error)
  }
}

// 获取直播间显示标签
const getRoomLabel = (room) => {
  const baseLabel = room.roomName ? `${room.roomName} (${room.roomId})` : room.roomId
  return baseLabel
}

// 格式化示例数据
const formattedSampleData = computed(() => {
  if (sampleDataList.value.length === 0) return ''
  const data = sampleDataList.value[currentSampleIndex.value]
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(data)
  }
})

// 显示示例数据对话框
const showSampleDialog = async () => {
  if (!form.value.socket_type) {
    ElMessage.warning('请先选择 Socket 类型')
    return
  }
  
  try {
    const res = await axios.get('/api/rooms/sample-data', {
      params: {
        socket_type: form.value.socket_type,
        limit: 10  // 最多获取10条示例
      }
    })
    
    sampleDataList.value = res.data.data || []
    currentSampleIndex.value = 0
    
    if (sampleDataList.value.length === 0) {
      ElMessage.warning('未找到该类型的消息数据')
    }
    
    sampleDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取示例数据失败')
  }
}

// 上一条
const prevSample = () => {
  if (currentSampleIndex.value > 0) {
    currentSampleIndex.value--
  }
}

// 下一条
const nextSample = () => {
  if (currentSampleIndex.value < sampleDataList.value.length - 1) {
    currentSampleIndex.value++
  }
}

// 复制示例数据
const copySampleData = () => {
  const text = formattedSampleData.value
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

onMounted(() => {
  loadProcessors()
  loadSocketTypes()
  loadRooms()
})
</script>

<style scoped>
.message-processor {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
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
