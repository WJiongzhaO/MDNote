<template>
  <div class="sidebar-icon-bar">
    <button
      v-for="item in sidebarItems"
      :key="item.id"
      :class="['icon-btn', { active: activeSidebar === item.id }]"
      @click="handleIconClick(item.id)"
      :title="item.title"
    >
      <span class="icon">{{ item.icon }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export type SidebarType = 'folders' | 'fragments' | 'git-history' | null;

interface SidebarItem {
  id: SidebarType;
  icon: string;
  title: string;
}

const props = defineProps<{
  activeSidebar: SidebarType;
}>();

const emit = defineEmits<{
  (e: 'switch-sidebar', type: SidebarType): void;
}>();

const sidebarItems: SidebarItem[] = [
  { id: 'folders', icon: '📁', title: '文件夹' },
  { id: 'fragments', icon: '📚', title: '知识片段库' },
  { id: 'git-history', icon: '🕒', title: 'Git历史' }
];

const handleIconClick = (id: SidebarType) => {
  // 如果点击的是当前激活的，则隐藏侧边栏
  const newActive = props.activeSidebar === id ? null : id;
  emit('switch-sidebar', newActive);
};
</script>

<style scoped>
.sidebar-icon-bar {
  width: 48px;
  height: 100vh;
  background: #2d2d2d;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 8px;
  border-right: 1px solid #1e1e1e;
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
  color: #ccc;
}

.icon-btn:hover {
  background: #3d3d3d;
  color: #fff;
}

.icon-btn.active {
  background: #007acc;
  color: #fff;
}

.icon {
  font-size: 1.5rem;
  line-height: 1;
}
</style>


