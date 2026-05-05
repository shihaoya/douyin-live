<template>
  <div id="app">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>🎬 抖音直播监控系统</h1>
          <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            router
            background-color="#409EFF"
            text-color="#fff"
            active-text-color="#ffd04b"
          >
            <el-menu-item index="/rooms">
              <el-icon><VideoCamera /></el-icon>
              <span>直播间监控管理</span>
            </el-menu-item>
            <el-menu-item index="/processor">
              <el-icon><Setting /></el-icon>
              <span>消息处理管理</span>
            </el-menu-item>
            <el-menu-item index="/messages">
              <el-icon><ChatDotRound /></el-icon>
              <span>消息管理</span>
            </el-menu-item>
            <el-menu-item index="/mappings">
              <el-icon><Connection /></el-icon>
              <span>映射配置</span>
            </el-menu-item>
            <el-menu-item index="/gifts">
              <el-icon><Present /></el-icon>
              <span>礼物管理</span>
            </el-menu-item>
            <el-menu-item index="/stats">
              <el-icon><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { VideoCamera, Setting, ChatDotRound, Connection, Present, DataAnalysis } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  height: 100vh;
}

.el-header {
  background-color: #409EFF;
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 30px;
}

.el-header h1 {
  font-size: 20px;
  font-weight: 500;
  white-space: nowrap;
}

.el-menu--horizontal {
  border-bottom: none !important;
  flex: 1;
}

.el-main {
  background-color: #f5f7fa;
  padding: 20px;
}
</style>
