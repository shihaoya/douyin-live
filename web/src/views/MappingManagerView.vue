<template>
  <div class="mapping-manager">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>值映射管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新建映射
          </el-button>
        </div>
      </template>

      <!-- 映射列表 -->
      <el-table :data="mappings" v-loading="loading" border stripe>
        <el-table-column prop="mapping_key" label="映射键名" width="180" />
        <el-table-column prop="mapping_name" label="映射名称" width="200" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="item_count" label="映射项数量" width="120" align="center" />
        <el-table-column prop="is_enabled" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_enabled ? 'success' : 'info'">
              {{ row.is_enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑映射' : '新建映射'" 
      width="800px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="映射键名" prop="mapping_key">
          <el-input v-model="form.mapping_key" placeholder="如: map_action" :disabled="isEdit" />
          <div class="form-tip">唯一标识，用于模板中引用，如 {action:map_action}</div>
        </el-form-item>
        <el-form-item label="映射名称" prop="mapping_name">
          <el-input v-model="form.mapping_name" placeholder="如: 动作类型映射" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        
        <el-divider content-position="left">映射项配置</el-divider>
        
        <el-form-item label="映射项">
          <div style="margin-bottom: 12px;">
            <el-button size="small" @click="addItem">
              <el-icon><Plus /></el-icon>
              添加映射项
            </el-button>
          </div>
          
          <el-table :data="form.items" border size="small">
            <el-table-column label="源值" width="150">
              <template #default="{ row, $index }">
                <el-input v-model="row.source_value" placeholder="如: 1" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="目标值">
              <template #default="{ row }">
                <el-input v-model="row.target_value" placeholder="如: 进入直播间" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="排序" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.sort_order" :min="0" size="small" controls-position="right" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="备注" width="200">
              <template #default="{ row }">
                <el-input v-model="row.remark" placeholder="可选" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ $index }">
                <el-button size="small" type="danger" link @click="removeItem($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="映射详情" width="700px">
      <el-descriptions :column="2" border v-if="currentMapping">
        <el-descriptions-item label="映射键名">{{ currentMapping.mapping_key }}</el-descriptions-item>
        <el-descriptions-item label="映射名称">{{ currentMapping.mapping_name }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentMapping.description || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentMapping.is_enabled ? 'success' : 'info'">
            {{ currentMapping.is_enabled ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentMapping.created_at) }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider content-position="left">映射项列表</el-divider>
      
      <el-table :data="currentMapping?.items || []" border stripe>
        <el-table-column prop="source_value" label="源值" width="150" />
        <el-table-column prop="target_value" label="目标值" />
        <el-table-column prop="sort_order" label="排序" width="100" align="center" />
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getMappings, createMapping, updateMapping, deleteMapping } from '@/api/mapping'

// 数据
const mappings = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const currentMapping = ref(null)

// 表单
const form = ref({
  mapping_key: '',
  mapping_name: '',
  description: '',
  items: []
})

// 验证规则
const rules = {
  mapping_key: [
    { required: true, message: '请输入映射键名', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  mapping_name: [
    { required: true, message: '请输入映射名称', trigger: 'blur' }
  ]
}

// 加载映射列表
const loadMappings = async () => {
  loading.value = true
  try {
    const res = await getMappings()
    mappings.value = res.data || []
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 添加映射项
const addItem = () => {
  form.value.items.push({
    source_value: '',
    target_value: '',
    sort_order: form.value.items.length,
    remark: ''
  })
}

// 删除映射项
const removeItem = (index) => {
  form.value.items.splice(index, 1)
}

// 重置表单
const resetForm = () => {
  form.value = {
    mapping_key: '',
    mapping_name: '',
    description: '',
    items: []
  }
  formRef.value?.clearValidate()
}

// 新建
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row) => {
  isEdit.value = true
  
  try {
    const res = await getMappings()
    const detail = res.data.find(m => m.id === row.id)
    
    // 获取详细信息
    const detailRes = await fetch(`/api/value-mappings/${row.id}`)
    const detailData = await detailRes.json()
    
    form.value = {
      mapping_key: detailData.data.mapping_key,
      mapping_name: detailData.data.mapping_name,
      description: detailData.data.description || '',
      items: (detailData.data.items || []).map(item => ({
        source_value: item.source_value,
        target_value: item.target_value,
        sort_order: item.sort_order,
        remark: item.remark || ''
      }))
    }
    
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

// 查看
const handleView = async (row) => {
  try {
    const res = await fetch(`/api/value-mappings/${row.id}`)
    const data = await res.json()
    currentMapping.value = data.data
    viewDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除映射 "${row.mapping_name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteMapping(row.id)
      ElMessage.success('删除成功')
      loadMappings()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }).catch(() => {})
}

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    // 验证映射项
    if (form.value.items.length === 0) {
      ElMessage.warning('请至少添加一个映射项')
      return
    }
    
    const hasEmpty = form.value.items.some(item => !item.source_value || !item.target_value)
    if (hasEmpty) {
      ElMessage.warning('请填写完整的映射项信息')
      return
    }
    
    submitting.value = true
    
    try {
      if (isEdit.value) {
        await updateMapping(form.value.id, form.value)
        ElMessage.success('更新成功')
      } else {
        await createMapping(form.value)
        ElMessage.success('创建成功')
      }
      
      dialogVisible.value = false
      loadMappings()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  loadMappings()
})
</script>

<style scoped>
.mapping-manager {
  padding: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
