<template>
  <div class="sidebar-icon-bar">
    <div class="icon-buttons">
      <!-- 返回首页按钮 -->
      <button class="icon-btn home-btn" @click="goHome" title="返回首页">
        <span class="icon">🏠</span>
      </button>

      <div class="divider"></div>

      <button
        v-for="item in sidebarItems"
        :key="item.id"
        :class="['icon-btn', { active: activeSidebar === item.id }]"
        @click="handleIconClick(item.id)"
        :title="item.title"
      >
        <span class="icon">{{ item.icon }}</span>
      </button>

      <div class="divider"></div>

      <!-- 知识库管理按钮 -->
      <button class="icon-btn" @click="goToFragmentManagement" title="知识片段管理">
        <span class="icon">📋</span>
      </button>

      <button class="icon-btn" @click="goToHealthDashboard" title="知识健康度">
        <span class="icon">📊</span>
      </button>
    </div>

    <!-- 主题切换按钮 -->
    <button
      class="icon-btn theme-toggle-btn"
      @click="toggleTheme"
      :title="isDark ? '切换到浅色主题' : '切换到暗色主题'"
    >
      <span class="icon">{{ isDark ? '🌙' : '☀️' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/presentation/composables/useTheme'
import { useRouter, useRoute } from 'vue-router'

export type SidebarType =
  | 'folders'
  | 'fragments'
  | 'templates'
  | 'variables'
  | 'knowledge-graphs'
  | null

interface SidebarItem {
  id: SidebarType
  icon: string
  title: string
}

const props = defineProps<{
  activeSidebar: SidebarType
}>()

const emit = defineEmits<{
  (e: 'switch-sidebar', type: SidebarType): void
}>()

const router = useRouter()
const route = useRoute()

// 主题相关
const { isDark, toggleTheme } = useTheme()

const sidebarItems: SidebarItem[] = [
  { id: 'folders', icon: '📁', title: '文件夹' },
  { id: 'fragments', icon: '📚', title: '知识片段库' },
  { id: 'templates', icon: '📑', title: '文档模板' },
  { id: 'variables', icon: '📝', title: '变量管理' },
  { id: 'knowledge-graphs', icon: '🕸️', title: '知识图谱' },
]

const handleIconClick = (id: SidebarType) => {
  // 如果点击的是当前激活的，则隐藏侧边栏
  const newActive = props.activeSidebar === id ? null : id
  emit('switch-sidebar', newActive)
}

const goHome = () => {
  router.push('/')
}

const goToFragmentManagement = () => {
  const vaultId = route.query.vaultId as string | undefined
  const query = vaultId ? `?vaultId=${encodeURIComponent(vaultId)}` : ''
  router.push(`/fragments${query}`)
}

const goToHealthDashboard = () => {
  const vaultId = route.query.vaultId as string | undefined
  const query = vaultId ? `?vaultId=${encodeURIComponent(vaultId)}` : ''
  router.push(`/fragments/health${query}`)
}
</script>

<style scoped>
.sidebar-icon-bar {
  width: 48px;
  height: 100vh;
  background: var(--bg-tertiary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-right: 1px solid var(--border-primary);
}

.icon-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.divider {
  width: 32px;
  height: 1px;
  background: var(--border-primary);
  margin: 4px 0;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn.active {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.home-btn:hover {
  background: var(--bg-hover);
}

.icon {
  font-size: 1.5rem;
  line-height: 1;
}
</style>
