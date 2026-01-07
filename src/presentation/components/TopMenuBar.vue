<template>
  <div class="top-menu-bar">
    <div class="menu-items">
      <div class="menu-item" @click="showFileMenu = !showFileMenu">
        <span>文件</span>
        <span class="menu-arrow">▼</span>
      </div>
      <div class="menu-item">
        <span>编辑</span>
      </div>
      <div class="menu-item">
        <span>视图</span>
      </div>
      <div class="menu-item">
        <span>帮助</span>
      </div>
    </div>

    <!-- File菜单下拉 -->
    <div v-if="showFileMenu" class="menu-dropdown" @click.stop>
      <div class="menu-dropdown-item" @click="handleNewDocument">
        <span class="menu-icon">📄</span>
        <span>新建文档</span>
        <span class="menu-shortcut">Ctrl+N</span>
      </div>
      <div class="menu-dropdown-item" @click="handleOpenDocument">
        <span class="menu-icon">📂</span>
        <span>打开文档</span>
        <span class="menu-shortcut">Ctrl+O</span>
      </div>
      <div class="menu-dropdown-item" @click="handleOpenFolder">
        <span class="menu-icon">📁</span>
        <span>打开文件夹</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-dropdown-item" v-if="recentDocuments.length > 0">
        <span class="menu-section-title">最近打开的文档</span>
      </div>
      <div
        v-for="doc in recentDocuments"
        :key="doc.id"
        class="menu-dropdown-item"
        @click="handleOpenRecentDocument(doc.id)"
      >
        <span class="menu-icon">📝</span>
        <span class="menu-text">{{ doc.title }}</span>
      </div>
      <div class="menu-divider" v-if="recentFolders.length > 0"></div>
      <div class="menu-dropdown-item" v-if="recentFolders.length > 0">
        <span class="menu-section-title">最近打开的文件夹</span>
      </div>
      <div
        v-for="folder in recentFolders"
        :key="folder.id"
        class="menu-dropdown-item"
        @click="handleOpenRecentFolder(folder.id)"
      >
        <span class="menu-icon">📁</span>
        <span class="menu-text">{{ folder.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface RecentDocument {
  id: string;
  title: string;
  openedAt: number;
}

interface RecentFolder {
  id: string;
  name: string;
  openedAt: number;
}

const emit = defineEmits<{
  (e: 'new-document'): void;
  (e: 'open-document'): void;
  (e: 'open-folder'): void;
  (e: 'open-recent-document', id: string): void;
  (e: 'open-recent-folder', id: string): void;
}>();

const showFileMenu = ref(false);
const recentDocuments = ref<RecentDocument[]>([]);
const recentFolders = ref<RecentFolder[]>([]);

const handleNewDocument = () => {
  showFileMenu.value = false;
  emit('new-document');
};

const handleOpenDocument = () => {
  showFileMenu.value = false;
  emit('open-document');
};

const handleOpenFolder = () => {
  showFileMenu.value = false;
  emit('open-folder');
};

const handleOpenRecentDocument = (id: string) => {
  showFileMenu.value = false;
  emit('open-recent-document', id);
};

const handleOpenRecentFolder = (id: string) => {
  showFileMenu.value = false;
  emit('open-recent-folder', id);
};

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.top-menu-bar')) {
    showFileMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadRecentItems();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const loadRecentItems = () => {
  // 从localStorage加载最近打开的文档和文件夹
  try {
    const recentDocs = localStorage.getItem('mdnote-recent-documents');
    if (recentDocs) {
      recentDocuments.value = JSON.parse(recentDocs)
        .sort((a: RecentDocument, b: RecentDocument) => b.openedAt - a.openedAt)
        .slice(0, 10);
    }

    const recentFolds = localStorage.getItem('mdnote-recent-folders');
    if (recentFolds) {
      recentFolders.value = JSON.parse(recentFolds)
        .sort((a: RecentFolder, b: RecentFolder) => b.openedAt - a.openedAt)
        .slice(0, 10);
    }
  } catch (error) {
    console.error('Error loading recent items:', error);
  }
};

// 暴露方法供外部调用
defineExpose({
  addRecentDocument: (doc: RecentDocument) => {
    const existing = recentDocuments.value.findIndex(d => d.id === doc.id);
    if (existing !== -1) {
      recentDocuments.value.splice(existing, 1);
    }
    recentDocuments.value.unshift({ ...doc, openedAt: Date.now() });
    recentDocuments.value = recentDocuments.value.slice(0, 10);
    localStorage.setItem('mdnote-recent-documents', JSON.stringify(recentDocuments.value));
  },
  addRecentFolder: (folder: RecentFolder) => {
    const existing = recentFolders.value.findIndex(f => f.id === folder.id);
    if (existing !== -1) {
      recentFolders.value.splice(existing, 1);
    }
    recentFolders.value.unshift({ ...folder, openedAt: Date.now() });
    recentFolders.value = recentFolders.value.slice(0, 10);
    localStorage.setItem('mdnote-recent-folders', JSON.stringify(recentFolders.value));
  }
});
</script>

<style scoped>
.top-menu-bar {
  height: 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  padding: 0 8px;
  position: relative;
  z-index: 100;
}

.menu-items {
  display: flex;
  gap: 4px;
}

.menu-item {
  padding: 4px 12px;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-primary);
  transition: background-color 0.2s;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-arrow {
  font-size: 10px;
  opacity: 0.7;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  min-width: 250px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 2px;
}

.menu-dropdown-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  transition: background-color 0.1s;
}

.menu-dropdown-item:hover {
  background: var(--bg-hover);
}

.menu-dropdown-item .menu-section-title {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  padding: 4px 0;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.menu-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-shortcut {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 11px;
}

.menu-divider {
  height: 1px;
  background: var(--border-secondary);
  margin: 4px 0;
}
</style>


