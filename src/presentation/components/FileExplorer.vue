<template>
  <div class="file-explorer">
    <!-- 路径显示栏 -->
    <div class="path-bar">
      <span class="path-label">当前路径：</span>
      <span class="path-value">{{ currentPath || '未打开文件夹' }}</span>
      <button v-if="currentPath" class="btn-close" @click="closeFolder" title="关闭文件夹">✕</button>
    </div>

    <!-- 文件树 -->
    <div class="file-tree" v-if="fileTree.length > 0">
      <FileTreeNode
        v-for="node in fileTree"
        :key="node.path"
        :node="node"
        :selected-path="selectedPath"
        @select="handleSelect"
        @context-menu="handleContextMenu"
        @expand="handleExpand"
      />
    </div>

    <div v-else class="empty-state">
      <p>请从 File 菜单打开文件夹</p>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="handleNewFile">
        <span class="menu-icon">📄</span>
        <span>新建文件</span>
      </div>
      <div class="context-menu-item" @click="handleNewFolder">
        <span class="menu-icon">📁</span>
        <span>新建文件夹</span>
      </div>
      <div v-if="contextMenu.node" class="context-menu-divider"></div>
      <div v-if="contextMenu.node" class="context-menu-item" @click="handleDelete">
        <span class="menu-icon">🗑️</span>
        <span>删除</span>
      </div>
      <div v-if="contextMenu.node && contextMenu.node.type === 'file'" class="context-menu-item" @click="handleRename">
        <span class="menu-icon">✎</span>
        <span>重命名</span>
      </div>
    </div>

    <!-- 新建文件对话框 -->
    <div v-if="showNewFileDialog" class="modal-overlay" @click="showNewFileDialog = false">
      <div class="modal" @click.stop>
        <h3>新建文件</h3>
        <input
          type="text"
          v-model="newFileName"
          placeholder="文件名（如：example.md）"
          @keyup.enter="createNewFile"
          ref="newFileInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewFileDialog = false">取消</button>
          <button class="btn btn-primary" @click="createNewFile" :disabled="!newFileName.trim()">创建</button>
        </div>
      </div>
    </div>

    <!-- 新建文件夹对话框 -->
    <div v-if="showNewFolderDialog" class="modal-overlay" @click="showNewFolderDialog = false">
      <div class="modal" @click.stop>
        <h3>新建文件夹</h3>
        <input
          type="text"
          v-model="newFolderName"
          placeholder="文件夹名"
          @keyup.enter="createNewFolder"
          ref="newFolderInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewFolderDialog = false">取消</button>
          <button class="btn btn-primary" @click="createNewFolder" :disabled="!newFolderName.trim()">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import FileTreeNode from './FileTreeNode.vue';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isExpanded?: boolean;
}

const emit = defineEmits<{
  (e: 'select-file', path: string): void;
  (e: 'open-folder', path: string): void;
}>();

const currentPath = ref<string>('');
const fileTree = ref<FileNode[]>([]);
const selectedPath = ref<string>('');
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as FileNode | null
});
const showNewFileDialog = ref(false);
const showNewFolderDialog = ref(false);
const newFileName = ref('');
const newFolderName = ref('');
const newFileInput = ref<HTMLInputElement>();
const newFolderInput = ref<HTMLInputElement>();
const contextMenuParentPath = ref<string>('');

const handleSelect = (path: string) => {
  selectedPath.value = path;
  emit('select-file', path);
};

const handleExpand = async (node: FileNode) => {
  await loadFolderChildren(node);
};

const handleContextMenu = (event: MouseEvent, node: FileNode) => {
  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    node
  };
  contextMenuParentPath.value = node.type === 'folder' ? node.path : getParentPath(node.path);
};

const handleNewFile = () => {
  contextMenu.value.visible = false;
  showNewFileDialog.value = true;
  newFileName.value = '';
  nextTick(() => {
    newFileInput.value?.focus();
  });
};

const handleNewFolder = () => {
  contextMenu.value.visible = false;
  showNewFolderDialog.value = true;
  newFolderName.value = '';
  nextTick(() => {
    newFolderInput.value?.focus();
  });
};

const handleDelete = () => {
  if (!contextMenu.value.node) return;
  const node = contextMenu.value.node;
  if (confirm(`确定要删除 ${node.name} 吗？`)) {
    deleteNode(node.path);
  }
  contextMenu.value.visible = false;
};

const handleRename = () => {
  // TODO: 实现重命名功能
  contextMenu.value.visible = false;
};

const createNewFile = async () => {
  if (!newFileName.value.trim()) return;
  
  const parentPath = contextMenuParentPath.value || currentPath.value;
  const filePath = `${parentPath}/${newFileName.value}`;
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.writeFileContent) {
      await electronAPI.file.writeFileContent(filePath, '');
      await loadFolder(currentPath.value);
      showNewFileDialog.value = false;
      newFileName.value = '';
    }
  } catch (error) {
    console.error('Error creating file:', error);
    alert('创建文件失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const createNewFolder = async () => {
  if (!newFolderName.value.trim()) return;
  
  const parentPath = contextMenuParentPath.value || currentPath.value;
  const folderPath = `${parentPath}/${newFolderName.value}`;
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file) {
      await electronAPI.file.mkdir(folderPath);
      await loadFolder(currentPath.value);
      showNewFolderDialog.value = false;
      newFolderName.value = '';
    }
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('创建文件夹失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const deleteNode = async (nodePath: string) => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.deleteNode) {
      await electronAPI.file.deleteNode(nodePath);
      await loadFolder(currentPath.value);
    }
  } catch (error) {
    console.error('Error deleting node:', error);
    alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

const getParentPath = (filePath: string): string => {
  return filePath.split('/').slice(0, -1).join('/') || filePath.split('\\').slice(0, -1).join('\\');
};

const loadFolder = async (folderPath: string) => {
  if (!folderPath) return;
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.readDirectory) {
      return;
    }

    // 读取文件夹内容
    const items = await electronAPI.file.readDirectory(folderPath);
    fileTree.value = buildFileTree(items, folderPath);
    currentPath.value = folderPath;
  } catch (error) {
    console.error('Error loading folder:', error);
  }
};


const buildFileTree = (items: Array<{ name: string; type: 'file' | 'folder'; path: string }>, rootPath: string): FileNode[] => {
  const tree: FileNode[] = [];
  
  // 直接构建树结构（只处理一级）
  for (const item of items) {
    const node: FileNode = {
      name: item.name,
      path: item.path,
      type: item.type,
      children: item.type === 'folder' ? [] : undefined,
      isExpanded: false
    };
    tree.push(node);
  }

  return tree;
};

// 加载文件夹的子项
const loadFolderChildren = async (folderNode: FileNode) => {
  if (folderNode.type !== 'folder' || folderNode.children === undefined) return;
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.readDirectory) {
      const items = await electronAPI.file.readDirectory(folderNode.path);
      folderNode.children = items.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type,
        children: item.type === 'folder' ? [] : undefined,
        isExpanded: false
      }));
    }
  } catch (error) {
    console.error('Error loading folder children:', error);
  }
};

const closeFolder = () => {
  currentPath.value = '';
  fileTree.value = [];
  selectedPath.value = '';
};

const handleClickOutside = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.context-menu')) {
    contextMenu.value.visible = false;
  }
};

// 菜单事件处理函数
let menuHandlers: Array<() => void> = [];

onMounted(async () => {
  document.addEventListener('click', handleClickOutside);
  
  // 尝试加载上次打开的文件夹
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.file && electronAPI.file.getLastOpenedFolder) {
      const lastFolder = await electronAPI.file.getLastOpenedFolder();
      if (lastFolder) {
        // 延迟加载，确保组件完全初始化
        await nextTick();
        await loadFolder(lastFolder);
        emit('open-folder', lastFolder);
      }
    }
  } catch (error) {
    console.error('Error loading last opened folder:', error);
  }
  
  // 监听主进程发送的恢复文件夹事件
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.on) {
    electronAPI.on('app:restore-last-folder', async (folderPath: string) => {
      if (folderPath) {
        await loadFolder(folderPath);
        emit('open-folder', folderPath);
      }
    });
  }
  
  // 监听菜单事件（只注册一次）
  if (electronAPI && electronAPI.menu) {
    const newFileHandler = () => {
      if (currentPath.value) {
        handleNewFile();
      } else {
        // 如果没有打开文件夹，先打开文件夹对话框
        electronAPI.dialog.openFolder().then((folderPath: string | null) => {
          if (folderPath) {
            loadFolder(folderPath).then(() => {
              handleNewFile();
            });
          }
        });
      }
    };
    
    const newFolderHandler = () => {
      if (currentPath.value) {
        handleNewFolder();
      } else {
        electronAPI.dialog.openFolder().then((folderPath: string | null) => {
          if (folderPath) {
            loadFolder(folderPath).then(() => {
              handleNewFolder();
            });
          }
        });
      }
    };

    const openFolderHandler = async (event: any, folderPath: string) => {
      // folderPath 是从主进程发送过来的
      if (folderPath) {
        await loadFolder(folderPath);
        emit('open-folder', folderPath);
      }
    };

    // 注册监听器
    electronAPI.menu.onNewFile(newFileHandler);
    electronAPI.menu.onNewFolder(newFolderHandler);
    electronAPI.menu.onOpenFolder(openFolderHandler);
    
    // 保存处理器引用以便清理
    menuHandlers = [newFileHandler, newFolderHandler, openFolderHandler];
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 暴露方法供外部调用
defineExpose({
  loadFolder,
  closeFolder,
  handleNewFile,
  handleNewFolder
});
</script>

<style scoped>
.file-explorer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.path-bar {
  padding: 8px 12px;
  background: #e9ecef;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.path-label {
  color: #666;
  font-weight: 500;
}

.path-value {
  flex: 1;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  color: #666;
  font-size: 1rem;
}

.btn-close:hover {
  color: #333;
  background: #dee2e6;
  border-radius: 3px;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  color: #333;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}

.menu-icon {
  font-size: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
}

.modal h3 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
}

.modal input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>

