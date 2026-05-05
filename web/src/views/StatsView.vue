<template>
  <div class="stats-page">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>📊 直播间数据统计</span>
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-select v-model="selectedRoom" placeholder="选择直播间" style="width: 250px;" @change="loadStats">
              <el-option 
                v-for="room in roomList" 
                :key="room.room_id" 
                :label="room.room_name ? `${room.room_name} (${room.room_id})` : room.room_id" 
                :value="room.room_id" 
              />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              style="width: 380px;"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
            <el-button type="primary" @click="loadStats" :disabled="!selectedRoom">刷新</el-button>
          </div>
        </div>
      </template>

        <div v-if="!selectedRoom" style="text-align: center; padding: 60px 20px; color: #909399;">
          <el-icon size="48"><DataAnalysis /></el-icon>
          <p style="margin-top: 10px;">请选择直播间查看统计数据</p>
        </div>

        <div v-else-if="loading" style="text-align: center; padding: 60px;">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
          <p style="margin-top: 10px; color: #909399;">加载中...</p>
        </div>

        <div v-else class="stats-grid">
          <!-- 总览卡片 -->
          <el-row :gutter="15" style="margin-bottom: 20px;">
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-value" style="color: #409eff;">{{ stats.totalLikes }}</div>
                <div class="stat-label">总点赞数</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-value" style="color: #67c23a;">{{ stats.enterStats.unique_visitors }}</div>
                <div class="stat-label">进场人数</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-value" style="color: #e6a23c;">{{ stats.enterStats.total_enters }}</div>
                <div class="stat-label">进场次数</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-value" style="color: #f56c6c;">{{ stats.userContribution.length }}</div>
                <div class="stat-label">送礼用户</div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 图表区域 -->
          <el-row :gutter="15">
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>💰 用户贡献榜 TOP10</template>
                <div ref="userChartRef" style="height: 350px;"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>🎁 礼物类型分布</template>
                <div ref="giftChartRef" style="height: 350px;"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="15" style="margin-top: 15px;">
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>👍 点赞排行榜</template>
                <div ref="likeChartRef" style="height: 350px;"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <template #header>💬 评论活跃榜</template>
                <div ref="commentChartRef" style="height: 350px;"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-row style="margin-top: 15px;">
            <el-col :span="24">
              <el-card shadow="hover">
                <template #header>📈 收入趋势</template>
                <div ref="revenueChartRef" style="height: 300px;"></div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-card>
      
      <!-- 详情弹窗 -->
      <el-dialog v-model="detailDialog.visible" :title="detailDialog.title" width="800px">
        <el-table :data="detailDialog.data" max-height="500" border stripe>
          <el-table-column prop="user_nickname" label="用户" width="120" />
          <el-table-column prop="gift_name" label="礼物" width="120" v-if="detailDialog.data.length > 0 && detailDialog.data[0].gift_name !== undefined" />
          <el-table-column prop="gift_count" label="数量" width="80" align="center" v-if="detailDialog.data.length > 0 && detailDialog.data[0].gift_count !== undefined" />
          <el-table-column prop="like_count" label="点赞数" width="80" align="center" v-if="detailDialog.data.length > 0 && detailDialog.data[0].like_count !== undefined" />
          <el-table-column prop="diamond_count" label="钻石" width="80" align="center" v-if="detailDialog.data.length > 0 && detailDialog.data[0].diamond_count !== undefined" />
          <el-table-column prop="total_diamonds" label="总钻石" width="90" align="center" v-if="detailDialog.data.length > 0 && detailDialog.data[0].total_diamonds !== undefined" />
          <el-table-column prop="content" label="内容" show-overflow-tooltip v-if="detailDialog.data.length > 0 && detailDialog.data[0].content !== undefined" />
          <el-table-column prop="received_at" label="时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.received_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { DataAnalysis, Loading } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { getRoomList, getRoomStats, getUserGiftDetails, getCommentDetails, getGiftTypeDetails, getLikeDetails } from '../api/stats';

const CORRECT_PASSWORD = '千羽最棒';
const roomList = ref([]);
const selectedRoom = ref('');
const dateRange = ref([]);
const loading = ref(false);
const stats = ref({
  userContribution: [],
  giftTypes: [],
  likeStats: [],
  totalLikes: 0,
  commentStats: [],
  revenueCurve: [],
  enterStats: { unique_visitors: 0, total_enters: 0 }
});

const userChartRef = ref(null);
const giftChartRef = ref(null);
const likeChartRef = ref(null);
const commentChartRef = ref(null);
const revenueChartRef = ref(null);

// 详情弹窗
const detailDialog = ref({
  visible: false,
  title: '',
  data: []
});

// 加载直播间列表
const loadRoomList = async () => {
  try {
    const res = await getRoomList();
    if (res.code === 200) {
      roomList.value = res.data;
    }
  } catch (error) {
    ElMessage.error('加载直播间列表失败');
  }
};

// 加载统计数据
const loadStats = async () => {
  if (!selectedRoom.value) return;
  
  loading.value = true;
  try {
    const params = {};
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0];
      params.endTime = dateRange.value[1];
    }
    
    const res = await getRoomStats(selectedRoom.value, params);
    console.log('统计数据:', res);
    if (res.code === 200) {
      stats.value = res.data;
      console.log('用户贡献:', stats.value.userContribution);
      console.log('礼物类型:', stats.value.giftTypes);
      await nextTick();
      renderCharts();
    }
  } catch (error) {
    console.error('加载统计失败:', error);
    ElMessage.error('加载统计数据失败');
  } finally {
    loading.value = false;
  }
};

// 渲染图表
const renderCharts = () => {
  console.log('开始渲染图表...');
  console.log('用户数据:', stats.value.userContribution);
  console.log('礼物数据:', stats.value.giftTypes);
  
  setTimeout(() => {
    renderUserChart();
    renderGiftChart();
    renderLikeChart();
    renderCommentChart();
    renderRevenueChart();
  }, 100);
};

// 用户贡献榜
const renderUserChart = () => {
  if (!userChartRef.value) {
    console.warn('userChartRef 未就绪');
    return;
  }
  const chart = echarts.init(userChartRef.value);
  const data = stats.value.userContribution.slice(0, 10);
  console.log('用户贡献图数据:', data);
  
  if (data.length === 0) {
    console.warn('用户贡献数据为空');
    return;
  }
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { 
      type: 'category', 
      data: data.map(item => item.user_nickname).reverse(),
      axisLabel: { interval: 0, fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: data.map(item => ({
        value: item.total_diamonds,
        userId: item.user_id,
        userNickname: item.user_nickname
      })).reverse(),
      itemStyle: { color: '#409eff' },
      label: { show: true, position: 'right' }
    }]
  });
  
  // 添加点击事件
  chart.on('click', (params) => {
    const userData = params.data;
    viewUserGifts({
      user_id: userData.userId,
      user_nickname: userData.userNickname
    });
  });
};

// 礼物类型分布
const renderGiftChart = () => {
  if (!giftChartRef.value) {
    console.warn('giftChartRef 未就绪');
    return;
  }
  const chart = echarts.init(giftChartRef.value);
  const data = stats.value.giftTypes.slice(0, 10);
  console.log('礼物类型图数据:', data);
  
  if (data.length === 0) {
    console.warn('礼物类型数据为空');
    return;
  }
  
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: data.map(item => ({ 
        name: item.gift_name, 
        value: item.total_count,
        giftName: item.gift_name
      })),
      label: { fontSize: 11 }
    }]
  });
  
  // 添加点击事件
  chart.on('click', (params) => {
    const giftData = params.data;
    viewGiftTypeDetails(giftData.giftName);
  });
};

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-';
  const date = new Date(time);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 查看用户礼物详情
const viewUserGifts = async (user) => {
  try {
    detailDialog.value.title = `${user.user_nickname} 的礼物记录`;
    detailDialog.value.data = [];
    detailDialog.value.visible = true;
    
    const params = {
      roomId: selectedRoom.value,
      userId: user.user_id
    };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0];
      params.endTime = dateRange.value[1];
    }
    
    const res = await getUserGiftDetails(params);
    if (res.code === 200) {
      detailDialog.value.data = res.data;
    }
  } catch (error) {
    console.error('加载礼物详情失败:', error);
    ElMessage.error('加载详情失败');
  }
};

// 查看评论详情
const viewComments = async (user) => {
  try {
    detailDialog.value.title = `${user.user_nickname} 的评论记录`;
    detailDialog.value.data = [];
    detailDialog.value.visible = true;
    
    const params = {
      roomId: selectedRoom.value,
      userId: user.user_id
    };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0];
      params.endTime = dateRange.value[1];
    }
    
    const res = await getCommentDetails(params);
    if (res.code === 200) {
      detailDialog.value.data = res.data;
    }
  } catch (error) {
    console.error('加载评论详情失败:', error);
    ElMessage.error('加载详情失败');
  }
};

// 查看礼物类型详情（谁送了这个礼物）
const viewGiftTypeDetails = async (giftName) => {
  try {
    detailDialog.value.title = `${giftName} 的赠送记录`;
    detailDialog.value.data = [];
    detailDialog.value.visible = true;
    
    const params = {
      roomId: selectedRoom.value,
      giftName: giftName
    };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0];
      params.endTime = dateRange.value[1];
    }
    
    const res = await getGiftTypeDetails(params);
    if (res.code === 200) {
      detailDialog.value.data = res.data;
    }
  } catch (error) {
    console.error('加载礼物类型详情失败:', error);
    ElMessage.error('加载详情失败');
  }
};

// 查看点赞详情
const viewLikeDetails = async (user) => {
  try {
    detailDialog.value.title = `${user.user_nickname} 的点赞记录`;
    detailDialog.value.data = [];
    detailDialog.value.visible = true;
    
    const params = {
      roomId: selectedRoom.value,
      userId: user.user_id
    };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0];
      params.endTime = dateRange.value[1];
    }
    
    const res = await getLikeDetails(params);
    if (res.code === 200) {
      detailDialog.value.data = res.data;
    }
  } catch (error) {
    console.error('加载点赞详情失败:', error);
    ElMessage.error('加载详情失败');
  }
};

// 点赞排行
const renderLikeChart = () => {
  if (!likeChartRef.value) {
    console.warn('likeChartRef 未就绪');
    return;
  }
  const chart = echarts.init(likeChartRef.value);
  const data = stats.value.likeStats.slice(0, 10);
  console.log('点赞图数据:', data);
  
  if (data.length === 0) {
    console.warn('点赞数据为空');
    return;
  }
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { 
      type: 'category', 
      data: data.map(item => item.user_nickname).reverse(),
      axisLabel: { interval: 0, fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: data.map(item => ({
        value: item.total_likes,
        userId: item.user_id,
        userNickname: item.user_nickname
      })).reverse(),
      itemStyle: { color: '#67c23a' },
      label: { show: true, position: 'right' }
    }]
  });
  
  // 添加点击事件
  chart.on('click', (params) => {
    const userData = params.data;
    viewLikeDetails({
      user_id: userData.userId,
      user_nickname: userData.userNickname
    });
  });
};

// 评论活跃榜
const renderCommentChart = () => {
  if (!commentChartRef.value) {
    console.warn('commentChartRef 未就绪');
    return;
  }
  const chart = echarts.init(commentChartRef.value);
  const data = stats.value.commentStats.slice(0, 10);
  console.log('评论图数据:', data);
  
  if (data.length === 0) {
    console.warn('评论数据为空');
    return;
  }
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { 
      type: 'category', 
      data: data.map(item => item.user_nickname).reverse(),
      axisLabel: { interval: 0, fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: data.map(item => ({
        value: item.comment_count,
        userId: item.user_id,
        userNickname: item.user_nickname
      })).reverse(),
      itemStyle: { color: '#e6a23c' },
      label: { show: true, position: 'right' }
    }]
  });
  
  // 添加点击事件
  chart.on('click', (params) => {
    const userData = params.data;
    viewComments({
      user_id: userData.userId,
      user_nickname: userData.userNickname
    });
  });
};

// 收入趋势
const renderRevenueChart = () => {
  if (!revenueChartRef.value) return;
  const chart = echarts.init(revenueChartRef.value);
  const data = stats.value.revenueCurve;
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: data.map(item => item.time_slot.substring(11, 16)),
      axisLabel: { rotate: 45, fontSize: 10 }
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'line',
      data: data.map(item => item.total_diamonds),
      smooth: true,
      itemStyle: { color: '#f56c6c' },
      areaStyle: { opacity: 0.2 }
    }]
  });
};

onMounted(() => {
  loadRoomList();
});
</script>

<style scoped>
.stats-page {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}
</style>
