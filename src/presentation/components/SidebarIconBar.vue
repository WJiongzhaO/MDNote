<template>
  <div class="sidebar-icon-bar">
    <div class="icon-buttons">
      <button
        v-for="item in sidebarItems"
        :key="item.id"
        :class="['icon-btn', { active: activeSidebar === item.id }]"
        @click="handleIconClick(item.id)"
        @contextmenu="handleContextMenu($event, item.id)"
        :title="item.title"
      >
        <span class="icon">
          <img v-if="item.icon.endsWith('.svg')" :src="item.icon" :alt="item.title" class="svg-icon" />
          <template v-else>{{ item.icon }}</template>
        </span>
      </button>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="handleManageFragments">
        <span class="menu-icon">📚</span>
        <span>管理知识片段</span>
      </div>
    </div>

    <!-- 返回知识库选择按钮 -->
    <button
      class="icon-btn back-btn"
      @click="handleBackToVaultSelect"
      title="返回知识库选择"
    >
      <span class="icon">
        <img src="/icon/home.svg" alt="返回知识库选择" class="svg-icon" />
      </span>
    </button>

    <!-- 主题切换按钮 -->
    <button
      class="icon-btn theme-toggle-btn"
      @click="toggleTheme"
      :title="isDark ? '切换到浅色主题' : '切换到暗色主题'"
    >
      <span class="icon">
        <img :src="isDark ? '/icon/dark.svg' : '/icon/light.svg'" :alt="isDark ? '暗色主题' : '浅色主题'" class="svg-icon" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTheme } from '@/presentation/composables/useTheme';

export type SidebarType =
  | 'folders'
  | 'fragments'
  | 'templates'
  | 'git-history'
  | 'variables'
  | 'knowledge-graphs'
  | null;

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
  (e: 'back-to-vault-select'): void;
  (e: 'manage-fragments'): void;
}>();

// 主题相关
const { isDark, toggleTheme } = useTheme();

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetId: null as SidebarType | null
});

const sidebarItems: SidebarItem[] = [
  { id: 'folders', icon: '/icon/folder.svg', title: '文件夹' },
  { id: 'fragments', icon: '/icon/fragment.svg', title: '知识片段库' },
  { id: 'templates', icon: '/icon/paper.svg', title: '文档模板' },
  { id: 'variables', icon: '📝', title: '变量管理' },
  { id: 'git-history', icon: '🕒', title: 'Git历史' },
  { id: 'knowledge-graphs', icon: '/icon/net.svg', title: '知识图谱' }
];

const handleIconClick = (id: SidebarType) => {
  // 如果点击的是当前激活的，则隐藏侧边栏
  const newActive = props.activeSidebar === id ? null : id;
  emit('switch-sidebar', newActive);
};

const handleBackToVaultSelect = () => {
  emit('back-to-vault-select');
};

// 右键菜单处理
const handleContextMenu = (event: MouseEvent, id: SidebarType) => {
  // 只在知识片段库按钮上显示右键菜单
  if (id !== 'fragments') {
    return;
  }

  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    targetId: id
  };
};

const handleManageFragments = () => {
  contextMenu.value.visible = false;
  emit('manage-fragments');
};

// 点击外部关闭右键菜单
const handleClickOutside = (event: MouseEvent) => {
  if (!(event.target as HTMLElement).closest('.context-menu')) {
    contextMenu.value.visible = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
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

.icon {
  font-size: 1.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  min-width: 150px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 6px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.menu-icon {
  font-size: 1rem;
}
</style>


