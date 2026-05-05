<template>
  <div class="gift-manager">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>礼物管理</span>
          <el-button type="primary" @click="handleSync" :loading="syncing">
            <el-icon><Refresh /></el-icon>
            同步礼物数据
          </el-button>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div style="margin-bottom: 20px; display: flex; gap: 10px;">
        <el-input 
          v-model="searchKeyword" 
          placeholder="搜索礼物名称" 
          clearable
          style="width: 300px;"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="sortBy" placeholder="排序方式" style="width: 150px;" @change="handleSearch">
          <el-option label="钻石价值" value="diamond_count" />
          <el-option label="礼物ID" value="gift_id" />
          <el-option label="更新时间" value="updated_at" />
        </el-select>
        
        <el-select v-model="sortOrder" placeholder="排序顺序" style="width: 120px;" @change="handleSearch">
          <el-option label="降序" value="DESC" />
          <el-option label="升序" value="ASC" />
        </el-select>
        
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
      </div>

      <!-- 礼物网格 -->
      <div v-loading="loading" class="gift-grid">
        <div v-for="gift in gifts" :key="gift.id" class="gift-item">
          <div class="gift-image">
            <img 
              :src="gift.image_url || '/placeholder.png'" 
              :alt="gift.name"
              @error="handleImageError"
            />
          </div>
          <div class="gift-info">
            <div class="gift-name" :title="gift.name">{{ gift.name }}</div>
            <div class="gift-diamond">
              <el-icon><Star /></el-icon>
              {{ gift.diamond_count }} 钻
            </div>
          </div>
          <div class="gift-actions">
            <el-button size="small" type="danger" @click="handleDelete(gift)">删除</el-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <el-pagination
        v-if="total > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[60, 120, 240]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        style="margin-top: 20px; justify-content: center;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, Star } from '@element-plus/icons-vue';
import { syncGifts, getGifts, deleteGift } from '../api/gift';

const loading = ref(false);
const syncing = ref(false);
const gifts = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(60);
const searchKeyword = ref('');
const sortBy = ref('diamond_count');
const sortOrder = ref('DESC');

// 加载礼物列表
const loadGifts = async () => {
  loading.value = true;
  try {
    const res = await getGifts({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
      sortBy: sortBy.value,
      order: sortOrder.value
    });
    
    if (res.code === 200) {
      gifts.value = res.data.gifts;
      total.value = res.data.total;
    }
  } catch (error) {
    ElMessage.error('加载礼物列表失败');
  } finally {
    loading.value = false;
  }
};

// 同步礼物
const handleSync = async () => {
  syncing.value = true;
  try {
    const res = await syncGifts();
    if (res.code === 200) {
      ElMessage.success(`同步成功，共${res.data.total}个礼物`);
      loadGifts();
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '同步失败');
  } finally {
    syncing.value = false;
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadGifts();
};

// 分页变化
const handlePageChange = (page) => {
  currentPage.value = page;
  loadGifts();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadGifts();
};

// 删除礼物
const handleDelete = async (gift) => {
  try {
    await ElMessageBox.confirm(`确定要删除礼物“${gift.name}”吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const res = await deleteGift(gift.id);
    if (res.code === 200) {
      ElMessage.success('删除成功');
      loadGifts();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

// 图片加载失败处理
const handleImageError = (e) => {
  e.target.src = '/placeholder.png';
};

onMounted(() => {
  loadGifts();
});
</script>

<style scoped>
.gift-manager {
  padding: 20px;
}

.gift-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 15px;
  min-height: 400px;
}

.gift-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  background: #fff;
}

.gift-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.gift-image {
  width: 100%;
  aspect-ratio: 1;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.gift-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.gift-info {
  padding: 8px;
  text-align: center;
}

.gift-name {
  font-size: 12px;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gift-diamond {
  font-size: 13px;
  color: #f56c6c;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.gift-actions {
  padding: 8px;
  border-top: 1px solid #ebeef5;
  text-align: center;
}

/* 响应式调整 */
@media (max-width: 1920px) {
  .gift-grid {
    grid-template-columns: repeat(10, 1fr);
  }
}

@media (max-width: 1600px) {
  .gift-grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (max-width: 1200px) {
  .gift-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
